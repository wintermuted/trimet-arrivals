import { faBus, faPersonWalking, faRoute, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import { endpointLabelForRequest, resolveStopReference, sameEndpoint } from "@trimet-arrivals/journeys";
import { Button, FieldGroup, Input } from "@wintermuted/ui-theme/react";
import distance from "@turf/distance";
import { MultiSelect } from "@wintermuted/ui-theme/react/select";
import React, { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FontAwesome from "react-fontawesome";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import geoLocateCurrentPosition from "../../api/geolocation/geoLocateCurrentPosition";
import { readAvailableBookmarkShortcuts, SHORTCUTS } from "../../api/localstorage/bookmarkShortcuts";
import { readRecentJourneys, recordRecentJourney, type RecentJourney } from "../../api/localstorage/recentJourneys";
import { PlannerRouteColors, plannerTransitColor } from "../../api/trimet/plannerRouteColors";
import {
  getStopCatalog,
  StopCatalog,
  StopCatalogStop,
} from "../../api/trimet/stopCatalog";
import {
  planTrip,
  parsePlannerCoordinates,
  TripPlannerItinerary,
  TripPlannerLeg,
  TripPlannerResponse,
} from "../../api/trimet/tripplanner";
import { selectBookmarks } from "../../store/selectors/bookmarkSelectors";
import PlannerStopSelect, { SavedPlannerStop } from "./PlannerStopSelect";
import { DirectionsStopPair, EndpointMarker } from "./DirectionsStopPair";
import "./TripPlannerView.scss";
import { categoryName, InterestPlace, PLACE_CATEGORIES, placeCategoryForId, usePlaceCatalog } from "@trimet-arrivals/places/catalog";

const EMPTY_STOPS: StopCatalogStop[] = [];

interface CatalogState {
  catalog?: StopCatalog;
  error: boolean;
  loading: boolean;
}

type TripState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" | "empty" };

type PlannedSearch = {
  from: PlannerEndpoint;
  to: PlannerEndpoint;
  response: TripPlannerResponse;
};

type PlannerEndpoint =
  | { kind: "stop"; stop: StopCatalogStop }
  | { kind: "place" | "coord"; value: string; interestPlace?: InterestPlace };
type EndpointField = "from" | "to";

function endpointLabel(endpoint: PlannerEndpoint, resolved?: TripPlannerResponse["from"]) {
  if (endpoint.kind === "stop") return `${endpoint.stop.desc} (${endpoint.stop.locid})`;
  if (endpoint.kind === "coord") return endpoint.interestPlace?.name || endpoint.value;
  return resolved?.description || endpoint.value;
}

function sameEndpointMessage(from: PlannerEndpoint, to: PlannerEndpoint) {
  return from.kind === "stop" && to.kind === "stop"
    ? "Choose two different stops to plan a trip."
    : "Choose two different locations to plan a trip.";
}

function endpointParams(endpoint: PlannerEndpoint, field: EndpointField) {
  if (endpoint.kind === "stop") return { [field]: String(endpoint.stop.locid) };
  return {
    [`${field}${endpoint.kind === "coord" ? "Coord" : "Place"}`]: endpoint.value,
    ...(endpoint.interestPlace ? { [`${field}PlaceId`]: endpoint.interestPlace.id } : {})
  };
}

function locationEndpoint(value: string, coordinates = false): PlannerEndpoint | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (coordinates || /^[+\-.\d\s,]+$/.test(trimmed) || /^[+-]?(?:\d+\.?\d*|\.\d+)\s*,/.test(trimmed)) {
    const point = parsePlannerCoordinates(trimmed);
    return point && { kind: "coord", value: point.join(",") };
  }
  return { kind: "place", value: trimmed };
}

const coordinateHelp = "Enter longitude, latitude (for example -122.68, 45.52).";

function formatStop(location?: TripPlannerLeg["from"]): string {
  if (!location?.description) {
    return location?.stopId ? `Stop ${location.stopId}` : "Stop information unavailable";
  }
  return location.stopId
    ? `${location.description} (${location.stopId})`
    : location.description;
}

function transferCount(itinerary: TripPlannerItinerary): number {
  return Math.max(
    0,
    itinerary.numberOfTransfers ??
      Math.max(
        0,
        itinerary.legs.filter((leg) => leg.mode && leg.mode !== "Walk").length -
          1,
      ),
  );
}

function legTitle(leg: TripPlannerLeg): string {
  if (leg.mode === "Walk") {
    return "Walk";
  }
  const routeName = leg.route?.name || leg.route?.number;
  return [leg.mode, routeName].filter(Boolean).join(" · ") || "Transit";
}

function legIcon(mode?: string) {
  const name = mode?.trim().toLowerCase() || "";
  if (name === "walk" || name === "walking") return faPersonWalking;
  if (/\b(bus|fx)\b/.test(name)) return faBus;
  if (/\b(light rail|max|streetcar|tram)\b/.test(name)) return faTrainTram;
  if (/\b(rail|train|wes)\b/.test(name)) return faTrain;
  return faRoute;
}

function LegIcon({ leg, routeColors }: { leg: TripPlannerLeg; routeColors?: PlannerRouteColors }) {
  const { iconName, icon: [width, height, , , paths] } = legIcon(leg.mode);
  const walking = iconName === "person-walking";
  return (
    <svg
      className={`transit-planner-leg-icon${walking ? " transit-planner-leg-icon--walk" : ""}`}
      style={walking ? undefined : { color: plannerTransitColor(leg, routeColors) }}
      data-icon={iconName}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {[paths].flat().map(path => <path key={path} d={path} />)}
    </svg>
  );
}

function JourneyDirections({ itinerary, headingRef, routeColors }: {
  itinerary: TripPlannerItinerary;
  headingRef: React.Ref<HTMLHeadingElement>;
  routeColors?: PlannerRouteColors;
}) {
  return (
    <>
      <header className="transit-journey-header">
        <h2 tabIndex={-1} ref={headingRef}>Journey directions</h2>
        <p>Planned times from TriMet, not live updates.</p>
        {itinerary.startTime && itinerary.endTime && (
          <p>Planned trip: {itinerary.startTime} to {itinerary.endTime}</p>
        )}
      </header>
      {itinerary.legs.length ? (
        <ol className="transit-journey-steps" aria-label="Journey steps">
          {itinerary.legs.map((leg, index) => {
            const walking = /^walk(?:ing)?$/i.test(leg.mode?.trim() ?? "");
            const hasRoute = !walking && Boolean(leg.route?.name || leg.route?.number);
            const direction = leg.direction || leg.route?.direction;
            return (
              <li className="transit-planner-leg" key={index}>
                <h3><LegIcon leg={leg} routeColors={routeColors} />{legTitle(leg)}</h3>
                {!walking && direction && <p className="transit-planner-leg-time">Direction: {direction}</p>}
                <dl>
                  <dt>{walking ? "Start walking" : hasRoute ? "Board at" : "Start at"}</dt>
                  <dd>{formatStop(leg.from)}<span>{leg.startTime ?? "Time unavailable"}</span></dd>
                  <dt>{hasRoute ? "Get off at" : "Arrive at"}</dt>
                  <dd>{formatStop(leg.to)}<span>{leg.endTime ?? "Time unavailable"}</span></dd>
                </dl>
              </li>
            );
          })}
        </ol>
      ) : <p>TriMet did not provide steps for this trip.</p>}
    </>
  );
}

function PlannerDisclosure({ title, children, onCollapse, headingId, edit }: {
  title: string;
  children: React.ReactNode;
  onCollapse?: () => void;
  headingId?: string;
  edit?: {
    label: string;
    buttonRef: React.Ref<HTMLButtonElement>;
    onClick: () => void;
  };
}) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const Heading = headingId ? "h2" : "h3";

  return (
    <div>
      <header className="transit-planner-disclosure-header">
        <Heading id={headingId} className="transit-planner-disclosure-heading">
          <button
            type="button"
            aria-controls={panelId}
            aria-expanded={expanded}
            onClick={() => {
              if (expanded) onCollapse?.();
              setExpanded(!expanded);
            }}
          >
            <FontAwesome name="caret-right" aria-hidden="true" />
            {title}
          </button>
        </Heading>
        {edit && (
          <button
            type="button"
            className="transit-planner-edit"
            ref={edit.buttonRef}
            aria-label={edit.label}
            title={edit.label}
            onClick={() => {
              setExpanded(true);
              edit.onClick();
            }}
          >
            <FontAwesome name="pencil" aria-hidden="true" />
          </button>
        )}
      </header>
      <div id={panelId} hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}

function ItineraryDetails({
  itinerary,
  index,
  highlight,
  routeColors,
}: {
  itinerary: TripPlannerItinerary;
  index: number;
  routeColors?: PlannerRouteColors;
  highlight?: {
    leg?: number;
    onHover: (leg?: number) => void;
    onFocus: (leg?: number) => void;
  };
}) {
  let transitLegSeen = false;

  return (
    <div className="transit-planner-itinerary-detail">
      <PlannerDisclosure
        title="Directions"
        onCollapse={() => {
          highlight?.onHover();
          highlight?.onFocus();
        }}
      >
        {itinerary.partial && (
          <p className="transit-planner-partial" role="status">
            Some details were missing from TriMet. Available leg information is
            shown below.
          </p>
        )}
        <ol aria-label={`Itinerary ${index + 1} steps`}>
          {itinerary.legs.map((leg, legIndex) => {
            const isTransit = leg.mode !== "Walk";
            const showTransfer = isTransit && transitLegSeen;
            if (isTransit) {
              transitLegSeen = true;
            }

            return (
              <li
                className={`transit-planner-leg${highlight?.leg === legIndex ? " transit-planner-leg--highlighted" : ""}`}
                key={leg.id || `${index}-${legIndex}`}
                tabIndex={highlight ? 0 : undefined}
                onPointerEnter={highlight ? event => {
                  if (event.pointerType !== "touch") highlight.onHover(legIndex);
                } : undefined}
                onPointerLeave={highlight ? () => highlight.onHover() : undefined}
                onFocus={highlight ? () => highlight.onFocus(legIndex) : undefined}
                onBlur={highlight ? () => highlight.onFocus() : undefined}
              >
                {showTransfer && (
                  <div className="transit-planner-transfer">Transfer</div>
                )}
                <div>
                  <LegIcon leg={leg} routeColors={routeColors} />
                  <strong>{legTitle(leg)}</strong>
                  {leg.direction && <span> · {leg.direction}</span>}
                </div>
                <DirectionsStopPair from={formatStop(leg.from)} to={formatStop(leg.to)} />
                {(leg.startTime || leg.endTime) && (
                  <p className="transit-planner-leg-time">
                    {leg.startTime || "Time unavailable"}
                    {leg.endTime ? `–${leg.endTime}` : ""}
                  </p>
                )}
                {(leg.duration !== undefined ||
                  leg.distance !== undefined) && (
                  <p className="transit-planner-leg-distance">
                    {leg.duration !== undefined && `${leg.duration} min`}
                    {leg.duration !== undefined &&
                      leg.distance !== undefined &&
                      " · "}
                    {leg.distance !== undefined &&
                      `${leg.distance.toFixed(2)} mi`}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </PlannerDisclosure>
    </div>
  );
}

function optionLegLabel(leg: TripPlannerLeg) {
  const mode = leg.mode?.trim();
  const name = leg.route?.name?.trim();
  const number = leg.route?.number?.trim();
  if (legIcon(mode) === faPersonWalking) return "Walk";
  const maxLine = name?.match(/^(MAX \w+ Line)(?: to |$)/i);
  if (maxLine) return maxLine[1];
  if (mode?.toLowerCase() === "bus" && number && /^\d+$/.test(number) && !/^FX\b/i.test(name || "")) {
    return `Bus ${number}`;
  }
  return name || [mode, number].filter(Boolean).join(" ") || "Leg details unavailable";
}

function TripOptionSummary({ itinerary, index, current, routeColors }: {
  itinerary: TripPlannerItinerary;
  index: number;
  current: boolean;
  routeColors?: PlannerRouteColors;
}) {
  const { startTime, endTime, duration, numberOfTransfers, legs } = itinerary;
  const schedule = startTime && endTime ? `${startTime} to ${endTime}`
    : startTime ? `Departs ${startTime}` : endTime ? `Arrives ${endTime}` : "Times unavailable";
  return (
    <>
      <span className="transit-planner-option-timing">
        <strong>{schedule}</strong>
        <span className="transit-planner-option-duration">
          {duration !== undefined ? `${duration} min` : "Duration unavailable"}
        </span>
      </span>
      {legs.length > 0 ? (
        <span className="transit-planner-option-route">
          {legs.map((leg, legIndex) => (
            <span className="transit-planner-option-step" key={legIndex}>
              {legIndex > 0 && <>
                <span className="wm-sr-only">Then </span>
                <span className="transit-planner-option-chevron" aria-hidden="true">›</span>
              </>}
              <span className="transit-planner-option-leg">
                <LegIcon leg={leg} routeColors={routeColors} />
                <span>{optionLegLabel(leg)}</span>
              </span>
            </span>
          ))}
        </span>
      ) : <span className="transit-planner-option-meta">Route details unavailable</span>}
      <span className="transit-planner-option-meta">
        Option {index + 1}
        {numberOfTransfers !== undefined && ` · ${numberOfTransfers} ${numberOfTransfers === 1 ? "transfer" : "transfers"}`}
        {current && " · Current trip"}
      </span>
    </>
  );
}

function loadRecentTrips() {
  try {
    return { journeys: readRecentJourneys(), unavailable: false };
  } catch {
    return { journeys: [], unavailable: true };
  }
}

interface TripPlannerProps {
  inSidebar?: boolean;
  directionsFooter?: HTMLDivElement;
  savedStops?: SavedPlannerStop[];
  renderPlaceDestination?: (place?: InterestPlace) => React.ReactNode;
  renderMapStatus?: (
    itineraries: TripPlannerItinerary[],
    selected: number,
    highlightedLeg: number | undefined,
    onMapLeg: (leg?: number) => void,
    routeColors?: PlannerRouteColors,
    previewTrip?: number
  ) => React.ReactNode;
}

export function ConnectedTripPlannerView(props: TripPlannerProps) {
  const bookmarks = useSelector(selectBookmarks);
  const shortcuts = readAvailableBookmarkShortcuts();
  const savedStops = SHORTCUTS.flatMap(({ key, kind, label }) => {
    const id = shortcuts[key];
    return kind === "stop" && id !== undefined && bookmarks[id] ? [{ id, label }] : [];
  });
  return <TripPlannerView {...props} savedStops={savedStops} />;
}

export default function TripPlannerView({ inSidebar = false, directionsFooter, renderMapStatus, renderPlaceDestination, savedStops }: TripPlannerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const fromCoord = searchParams.get("fromCoord");
  const toCoord = searchParams.get("toCoord");
  const fromPlace = searchParams.get("fromPlace");
  const toPlace = searchParams.get("toPlace");
  const fromPlaceId = searchParams.get("fromPlaceId");
  const toPlaceId = searchParams.get("toPlaceId");
  const confirmPlace = searchParams.get("confirmPlace") === "1";
  const placeCatalog = usePlaceCatalog(Boolean(fromPlaceId || toPlaceId));
  const fromNamedPlace = placeCatalog.places.find(place => place.id === fromPlaceId && place.coordinates.join(",") === fromCoord);
  const toNamedPlace = placeCatalog.places.find(place => place.id === toPlaceId && place.coordinates.join(",") === toCoord);
  const requiredPlaceCategories = PLACE_CATEGORIES.filter(category =>
    [fromPlaceId, toPlaceId].some(id => placeCategoryForId(id) === category));
  const placesPending = requiredPlaceCategories.some(category => !placeCatalog.sources[category].snapshot && !placeCatalog.sources[category].error);
  const placesFailed = requiredPlaceCategories.some(category => placeCatalog.sources[category].error);
  const [fromInterestPlace, setFromInterestPlace] = useState<InterestPlace>();
  const [toInterestPlace, setToInterestPlace] = useState<InterestPlace>();
  const fromLinkedLocation = fromCoord ?? fromPlace;
  const toLinkedLocation = toCoord ?? toPlace;
  const [catalogState, setCatalogState] = useState<CatalogState>({
    error: false,
    loading: true,
  });
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [fromStop, setFromStop] = useState<StopCatalogStop>();
  const [toStop, setToStop] = useState<StopCatalogStop>();
  const [fromLocation, setFromLocation] = useState<string>();
  const [toLocation, setToLocation] = useState<string>();
  const [locating, setLocating] = useState<EndpointField>();
  const locationRequest = useRef(0);
  const pendingEndpointFocus = useRef<EndpointField>(undefined);
  const [selectedItinerary, setSelectedItinerary] = useState(-1);
  const [editingTrip, setEditingTrip] = useState(false);
  const [hoveredTrip, setHoveredTrip] = useState<number>();
  const [focusedTrip, setFocusedTrip] = useState<number>();
  const [journeyItinerary, setJourneyItinerary] = useState<TripPlannerItinerary>();
  const planningContent = useRef<HTMLElement>(null);
  const journeyHeading = useRef<HTMLHeadingElement>(null);
  const planningScrollTop = useRef<number>(undefined);
  const editTripButton = useRef<HTMLButtonElement>(null);
  const currentTripOption = useRef<HTMLButtonElement>(null);
  const [hoveredLeg, setHoveredLeg] = useState<number>();
  const [focusedLeg, setFocusedLeg] = useState<number>();
  const [mapLeg, setMapLeg] = useState<number>();
  const [tripRetry, setTripRetry] = useState(0);
  const [tripState, setTripState] = useState<TripState>({ status: "idle" });
  const [plannedSearch, setPlannedSearch] = useState<PlannedSearch>();
  const [editingStops, setEditingStops] = useState(false);
  const editStopsButton = useRef<HTMLButtonElement>(null);
  const searchFields = useRef<HTMLFieldSetElement>(null);
  const focusStopSummary = useRef(false);
  const focusBoardingStop = useRef(false);
  const [validationError, setValidationError] = useState("");
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [recentTrips, setRecentTrips] = useState(() => inSidebar ? loadRecentTrips() : undefined);

  useEffect(() => {
    let active = true;
    setCatalogState((previous) => ({
      ...previous,
      error: false,
      loading: true,
    }));

    getStopCatalog(catalogRetry > 0)
      .then((catalog) => {
        if (active) {
          setCatalogState({ catalog, error: false, loading: false });
        }
      })
      .catch(() => {
        if (active) {
          setCatalogState((previous) => ({
            ...previous,
            error: true,
            loading: false,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [catalogRetry]);

  const catalog = catalogState.catalog;
  const lookupCatalog = fromLinkedLocation === null || toLinkedLocation === null ? catalog : undefined;

  useEffect(() => {
    setFromLocation(fromLinkedLocation ?? undefined);
    setToLocation(toLinkedLocation ?? undefined);
    setFromInterestPlace(fromNamedPlace);
    setToInterestPlace(toNamedPlace);
    setValidationError("");
    setLocating(undefined);
    return () => { locationRequest.current += 1; };
  }, [fromParam, toParam, fromLinkedLocation, toLinkedLocation, fromNamedPlace, toNamedPlace]);

  useEffect(() => {
    if (!catalog) {
      return;
    }

    const from = resolveStopReference(catalog.stops, fromParam);
    const to = resolveStopReference(catalog.stops, toParam);
    setFromStop(from.stop);
    setToStop(to.stop);
  }, [catalog, fromParam, toParam]);

  useEffect(() => {
    setHistoryUnavailable(false);
    setEditingStops(true);
    if ((fromPlaceId && !fromNamedPlace) || (toPlaceId && !toNamedPlace)) {
      if (placesPending) {
        setTripState({ status: "loading" });
      } else {
        setTripState({ status: "error", message: "The linked place could not be verified against its location snapshot. Retry loading places or enter your destination manually." });
      }
      return;
    }
    if (!(fromLinkedLocation ?? fromParam) || !(toLinkedLocation ?? toParam)) {
      setTripState({ status: "idle" });
      return;
    }

    const from = resolveStopReference(lookupCatalog?.stops ?? EMPTY_STOPS, fromParam).stop;
    const to = resolveStopReference(lookupCatalog?.stops ?? EMPTY_STOPS, toParam).stop;
    const origin = fromLinkedLocation !== null ? locationEndpoint(fromLinkedLocation, fromCoord !== null) :
      from && { kind: "stop" as const, stop: from };
    const destination = toLinkedLocation !== null ? locationEndpoint(toLinkedLocation, toCoord !== null) :
      to && { kind: "stop" as const, stop: to };
    if ((fromLinkedLocation !== null && !origin) || (toLinkedLocation !== null && !destination)) {
      setTripState({ status: "error", message: `The linked location is invalid. ${coordinateHelp}` });
      return;
    }
    if (!origin || !destination) {
      setTripState({ status: "idle" });
      return;
    }
    if (origin.kind !== "stop") origin.interestPlace = fromNamedPlace;
    if (destination.kind !== "stop") destination.interestPlace = toNamedPlace;
    if (confirmPlace && (fromNamedPlace || toNamedPlace)) {
      setTripState({ status: "idle" });
      return;
    }
    if (sameEndpoint(origin, destination)) {
      setTripState({
        status: "error",
        message: sameEndpointMessage(origin, destination),
      });
      return;
    }

    const controller = new AbortController();
    setTripState({ status: "loading" });
    planTrip({
      ...(origin.kind === "coord" ? { fromCoord: origin.value, fromPlace: origin.value } : { fromPlace: endpointLabelForRequest(origin) }),
      ...(destination.kind === "coord" ? { toCoord: destination.value, toPlace: destination.value } : { toPlace: endpointLabelForRequest(destination) }),
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        if (!response.success) {
          setTripState({
            status: "error",
            message: response.errorMessage?.startsWith("Uncertain Location")
              ? `TriMet could not identify the location. ${response.errorMessage}. Try a more specific name, a street address without city or state, or coordinates.`
              : response.errorMessage || "TriMet could not find a trip for these locations.",
          });
          return;
        }
        if (response.itineraries.length === 0) {
          setTripState({ status: "empty" });
          return;
        }
        setPlannedSearch({ from: origin, to: destination, response });
        setTripState({ status: "ready" });
        setSelectedItinerary(-1);
        setEditingTrip(false);
        clearTripPreview();
        setJourneyItinerary(undefined);
        setEditingStops(false);
        if (origin.kind === "stop" && destination.kind === "stop") {
          try {
            recordRecentJourney(origin.stop, destination.stop);
            if (inSidebar) setRecentTrips(loadRecentTrips());
          } catch {
            setHistoryUnavailable(true);
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTripState({
            status: "error",
            message: "Could not load trip options from TriMet.",
          });
        }
      });

    return () => controller.abort();
  }, [lookupCatalog, fromParam, toParam, fromLinkedLocation, toLinkedLocation, fromCoord, toCoord, tripRetry, inSidebar,
    fromPlaceId, toPlaceId, fromNamedPlace, toNamedPlace, confirmPlace, placesPending, placesFailed]);

  useLayoutEffect(() => {
    const field = pendingEndpointFocus.current;
    if (!field) return;
    pendingEndpointFocus.current = undefined;
    searchFields.current?.querySelector<HTMLInputElement>(`#planner-${field}`)?.focus();
  }, [fromLocation, toLocation, locating]);

  function cancelLocationLookup() {
    locationRequest.current += 1;
    setLocating(undefined);
  }

  function swapEndpoints() {
    cancelLocationLookup();
    setFromStop(toStop);
    setToStop(fromStop);
    setFromLocation(toLocation);
    setToLocation(fromLocation);
    setFromInterestPlace(toInterestPlace);
    setToInterestPlace(fromInterestPlace);
    setValidationError("");
  }

  async function useNearestStop(field: EndpointField) {
    if (!catalog) return;
    const request = ++locationRequest.current;
    setLocating(field);
    setValidationError("");
    try {
      const { coords } = await geoLocateCurrentPosition();
      if (request !== locationRequest.current) return;
      const point = parsePlannerCoordinates(`${coords.longitude},${coords.latitude}`);
      let nearest: StopCatalogStop | undefined;
      let bestDistance = 1;
      if (point) {
        for (const stop of catalog.stops) {
          if (!Number.isFinite(stop.lng) || !Number.isFinite(stop.lat)) continue;
          const miles = distance(point, [stop.lng, stop.lat], { units: "miles" });
          if (miles < bestDistance) {
            nearest = stop;
            bestDistance = miles;
          }
        }
      }
      if (nearest) {
        pendingEndpointFocus.current = field;
        chooseStop(nearest, field);
      } else {
        setValidationError("No TriMet stop was found within one mile. Enter a place, address, or coordinates instead.");
      }
    } catch {
      if (request === locationRequest.current) {
        setValidationError("Could not use your location. Check browser permissions or enter a location manually.");
      }
    } finally {
      if (request === locationRequest.current) setLocating(undefined);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    const from = fromLocation !== undefined ? locationEndpoint(fromLocation) : fromStop && { kind: "stop" as const, stop: fromStop };
    const to = toLocation !== undefined ? locationEndpoint(toLocation) : toStop && { kind: "stop" as const, stop: toStop };
    if ((fromLocation?.trim() && !from) || (toLocation?.trim() && !to)) {
      setValidationError(`Check the ${!from ? "origin" : "destination"} coordinates. ${coordinateHelp}`);
      return;
    }
    if (!from || !to) {
      setValidationError("Choose an origin and a destination.");
      return;
    }
    if (sameEndpoint(from, to)) {
      setValidationError(sameEndpointMessage(from, to));
      return;
    }
    if (from.kind !== "stop" && fromInterestPlace?.coordinates.join(",") === from.value) from.interestPlace = fromInterestPlace;
    if (to.kind !== "stop" && toInterestPlace?.coordinates.join(",") === to.value) to.interestPlace = toInterestPlace;

    focusStopSummary.current = true;
    const params = { ...endpointParams(from, "from"), ...endpointParams(to, "to"),
      ...(searchParams.get("placesView") ? { placesView: searchParams.get("placesView") } : {}) };
    if (new URLSearchParams(params).toString() === searchParams.toString()) {
      setTripRetry(value => value + 1);
    } else {
      setSearchParams(params);
    }
  }

  function chooseStop(
    stop: StopCatalogStop | null,
    field: EndpointField,
  ) {
    if (field === "from") {
      setFromStop(stop ?? undefined);
      setFromLocation(undefined);
      setFromInterestPlace(undefined);
    } else {
      setToStop(stop ?? undefined);
      setToLocation(undefined);
      setToInterestPlace(undefined);
    }
    setValidationError("");
  }

  function chooseRecentTrip(journey: RecentJourney | null) {
    if (!journey) return;
    focusStopSummary.current = true;
    const { from, to } = journey;
    const params = { from: String(from.locid), to: String(to.locid) };
    if (params.from !== fromParam || params.to !== toParam || fromLinkedLocation !== null || toLinkedLocation !== null) {
      setSearchParams(params);
      return;
    }
    const origin = catalog?.stops.find(stop => stop.locid === from.locid);
    const destination = catalog?.stops.find(stop => stop.locid === to.locid);
    if (origin && destination) {
      chooseStop(origin, "from");
      chooseStop(destination, "to");
    }
    setTripRetry(value => value + 1);
  }

  function renderStopField(field: "from" | "to") {
    const isFrom = field === "from";
    const selected = isFrom ? fromStop : toStop;
    const label = isFrom ? "Boarding stop" : "Destination stop";
    const id = isFrom ? "planner-from" : "planner-to";
    const location = isFrom ? fromLocation : toLocation;
    const setLocation = isFrom ? setFromLocation : setToLocation;
    const interestPlace = isFrom ? fromInterestPlace : toInterestPlace;
    const setInterestPlace = isFrom ? setFromInterestPlace : setToInterestPlace;
    const reference = isFrom ? fromParam : toParam;
    const referenceResolution =
      catalog && reference
        ? resolveStopReference(catalog.stops, reference)
        : undefined;
    const nearestStopLabel = `Use nearest stop to me for ${isFrom ? "boarding" : "destination"}`;

    return (
      <div className="transit-planner-stop-field">
        <div className="transit-planner-endpoint-row">
          {location !== undefined ? (
            <FieldGroup label={isFrom ? "Origin address, place, or coordinates" : "Destination address, place, or coordinates"} htmlFor={id}>
              <Input id={id} value={location} maxLength={240} autoComplete="off" aria-describedby={`${id}-hint`}
                onChange={event => {
                  cancelLocationLookup();
                  setLocation(event.target.value);
                  setInterestPlace(undefined);
                  setValidationError("");
                }} />
            </FieldGroup>
          ) : (
            <FieldGroup label={label} htmlFor={id}>
              <PlannerStopSelect
                id={id}
                stops={catalog?.stops ?? EMPTY_STOPS}
                savedStops={savedStops}
                selected={selected}
                loading={catalogState.loading}
                onChange={stop => {
                  cancelLocationLookup();
                  chooseStop(stop, field);
                }}
              />
            </FieldGroup>
          )}
          <Button type="button" size="sm" variant="secondary" className="transit-planner-nearest-stop"
            disabled={!catalog || Boolean(locating)}
            aria-label={nearestStopLabel}
            title={nearestStopLabel}
            aria-describedby="planner-location-privacy"
            onClick={() => void useNearestStop(field)}>
            <FontAwesome name={locating === field ? "spinner" : "location-arrow"} spin={locating === field} aria-hidden="true" />
          </Button>
        </div>
        {location !== undefined ? (
          <div className="transit-planner-location-field">
            {interestPlace && <p><strong>{interestPlace.name}</strong><br />Approximate map point; entrance not verified. Confirm or edit these coordinates before finding trips.</p>}
            <p className="transit-planner-select-hint" id={`${id}-hint`}>
              Try a street address without city or state, a place name, or longitude, latitude.
            </p>
            <Button type="button" size="sm" variant="secondary" className="transit-planner-mode-button" onClick={() => {
              cancelLocationLookup();
              pendingEndpointFocus.current = field;
              setLocation(undefined);
              setInterestPlace(undefined);
              setValidationError("");
            }}>Use a {isFrom ? "boarding" : "destination"} stop</Button>
          </div>
        ) : <>
        <Button type="button" size="sm" variant="secondary" className="transit-planner-mode-button transit-planner-location-toggle"
          onClick={() => {
            cancelLocationLookup();
            pendingEndpointFocus.current = field;
            setLocation("");
            setValidationError("");
          }}>
          {isFrom ? "Other origin options" : "Other destination options"}
        </Button>
        {!selected &&
          referenceResolution &&
          referenceResolution.matches.length > 1 && (
          <p className="transit-planner-field-message" role="alert">
            This stop name matches multiple platforms. Choose the correct stop
            from the results.
          </p>
        )}
        {!selected &&
          referenceResolution &&
          referenceResolution.matches.length === 0 && (
            <p className="transit-planner-field-message" role="alert">
              The linked stop “{reference}” was not found. Search by stop name
              or ID and choose a result.
            </p>
          )}
        </>}
      </div>
    );
  }

  const response = plannedSearch?.response;
  const stopSummary = editingStops ? undefined : plannedSearch;
  const itineraries = response?.itineraries || [];
  const activeItinerary = itineraries[selectedItinerary];
  const inJourney = Boolean(journeyItinerary && journeyItinerary === activeItinerary);
  const previewTrip = !inJourney && (!activeItinerary || editingTrip) ? hoveredTrip ?? focusedTrip : undefined;
  const highlightedLeg = hoveredLeg ?? mapLeg ?? focusedLeg;

  function clearTripPreview() {
    setHoveredTrip(undefined);
    setFocusedTrip(undefined);
  }

  useEffect(() => {
    if (stopSummary && focusStopSummary.current) {
      editStopsButton.current?.focus();
      focusStopSummary.current = false;
    }
    if (!stopSummary && focusBoardingStop.current) {
      searchFields.current?.querySelector<HTMLInputElement>("#planner-from")?.focus();
      focusBoardingStop.current = false;
    }
  }, [stopSummary]);

  useEffect(() => {
    if (selectedItinerary < 0) return;
    (editingTrip ? currentTripOption : editTripButton).current?.focus();
  }, [selectedItinerary, editingTrip]);

  useLayoutEffect(() => {
    const scrollRegion = planningContent.current?.closest(".transit-nearby-results");
    if (inJourney) {
      if (scrollRegion) scrollRegion.scrollTop = 0;
      journeyHeading.current?.focus({ preventScroll: true });
    } else if (planningScrollTop.current !== undefined) {
      if (scrollRegion) scrollRegion.scrollTop = planningScrollTop.current;
      planningScrollTop.current = undefined;
      directionsFooter?.querySelector("button")?.focus({ preventScroll: true });
    }
  }, [inJourney, directionsFooter]);

  function openJourney() {
    planningScrollTop.current = planningContent.current?.closest(".transit-nearby-results")?.scrollTop ?? 0;
    setHoveredLeg(undefined);
    setFocusedLeg(undefined);
    setJourneyItinerary(activeItinerary);
  }

  useEffect(() => {
    setHoveredLeg(undefined);
    setFocusedLeg(undefined);
    setMapLeg(undefined);
  }, [activeItinerary, selectedItinerary]);

  return (
    <>
    {renderPlaceDestination?.(toInterestPlace)}
    <section
      className={`transit-planner${inSidebar ? " transit-planner--sidebar" : ""}`}
      aria-labelledby="transit-planner-title"
      hidden={inJourney}
      ref={planningContent}
    >
      <PlannerDisclosure title="Plan a trip" headingId="transit-planner-title" edit={stopSummary ? {
        label: stopSummary.from.kind === "stop" && stopSummary.to.kind === "stop" ? "Edit stops" : "Edit locations",
        buttonRef: editStopsButton,
        onClick: () => {
          focusBoardingStop.current = true;
          setEditingStops(true);
        },
      } : undefined}>
        {stopSummary ? (
            <dl className={`transit-planner-stop-summary transit-planner-endpoint-pair${inSidebar ? " transit-planner-endpoint-pair--rail" : ""}`}>
              <div className="transit-planner-endpoint">
                <dt>{inSidebar && <EndpointMarker field="from" />}{stopSummary.from.kind === "stop" ? "Boarding stop" : "Origin"}</dt>
                <dd>{endpointLabel(stopSummary.from, stopSummary.response.from)}</dd>
              </div>
              <div className="transit-planner-endpoint">
                <dt>{inSidebar && <EndpointMarker field="to" />}{stopSummary.to.kind === "stop" ? "Destination stop" : "Destination"}</dt>
                <dd>{endpointLabel(stopSummary.to, stopSummary.response.to)}</dd>
              </div>
            </dl>
        ) : (
          <fieldset ref={searchFields} className="transit-planner-search-fields" disabled={tripState.status === "loading"}
            aria-label="Trip search">
        {!inSidebar && (
          <p className="transit-planner-intro">
            Plan between TriMet stops, street addresses, places, or coordinates.
          </p>
        )}
        {confirmPlace && (fromNamedPlace || toNamedPlace) && <p role="status" className="transit-planner-message">
          Confirm the approximate arrival point below, or enter a public entrance address. Finding trips does not verify public access.
          {searchParams.get("fromOrigin") === "device" ? " Origin uses your previously selected device location, not live tracking." :
            searchParams.get("fromOrigin") === "area" ? " Origin uses your previously selected map search center." :
              searchParams.get("fromOrigin") === "pin" ? " Origin uses your previously dropped pin." : ""}
        </p>}

        {recentTrips?.unavailable ? (
          <p className="transit-planner-message" role="status">Recent trips are unavailable on this device.</p>
        ) : recentTrips?.journeys.length > 0 && (
          <div className="transit-planner-recent">
            <FieldGroup label="Recent trips" htmlFor="planner-recent">
              <MultiSelect<RecentJourney, false>
                inputId="planner-recent"
                isMulti={false}
                options={recentTrips.journeys}
                value={null}
                onChange={chooseRecentTrip}
                getOptionLabel={({ from, to }) => `${from.desc} (${from.locid}) to ${to.desc} (${to.locid})`}
                getOptionValue={({ from, to }) => `${from.locid}-${to.locid}`}
                placeholder="Choose a recent trip"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                styles={{
                  control: base => ({ ...base, minHeight: "var(--wm-control-height)" }),
                  menu: base => ({ ...base, fontSize: "0.875rem" }),
                  menuPortal: base => ({ ...base, zIndex: 5 })
                }}
              />
            </FieldGroup>
          </div>
        )}

        {catalogState.loading && (
          <p role="status">
            {catalog ? "Refreshing stops…" : "Loading TriMet stops…"}
          </p>
        )}
        {catalogState.error && (
          <div role="alert" className="transit-planner-message">
            <p>
              The TriMet stop catalog could not be loaded.
              {catalog
                ? " The previously loaded stops are still available."
                : " Check your connection and try again."}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCatalogRetry((value) => value + 1)}
            >
              Retry loading stops
            </Button>
          </div>
        )}

        <form className="transit-planner-form" onSubmit={submit}>
          <div className={`transit-planner-endpoint-pair transit-planner-endpoint-pair--editing${inSidebar ? " transit-planner-endpoint-pair--rail" : ""}`}>
            <div className="transit-planner-endpoint">
              {inSidebar && <EndpointMarker field="from" />}
              {renderStopField("from")}
            </div>
            <Button type="button" size="sm" variant="secondary" className="transit-planner-swap"
              aria-label="Swap origin and destination"
              title="Swap origin and destination"
              disabled={!(fromLocation?.trim() || toLocation?.trim() ||
                (fromLocation === undefined && fromStop) || (toLocation === undefined && toStop))}
              onClick={swapEndpoints}>
              <FontAwesome name="exchange" aria-hidden="true" />
            </Button>
            <div className="transit-planner-endpoint">
              {inSidebar && <EndpointMarker field="to" />}
              {renderStopField("to")}
            </div>
          </div>
          <p className="transit-planner-select-hint" id="planner-location-privacy">
            Nearest stop uses your location on this device only.
          </p>
          {locating && <p className="transit-planner-select-hint" role="status">Finding nearest stop…</p>}
          {(fromLocation === undefined || toLocation === undefined) &&
            <p className="transit-planner-select-hint">Search by stop ID, stop name, route name, or common place.</p>}
          {validationError && (
            <p className="transit-planner-message" role="alert">
              {validationError}
            </p>
          )}
          <Button
            type="submit"
            disabled={Boolean(locating) ||
              (fromLocation === undefined ? !fromStop || catalogState.loading : !fromLocation.trim()) ||
              (toLocation === undefined ? !toStop || catalogState.loading : !toLocation.trim())}
          >
            Find trips
          </Button>
        </form>
          </fieldset>
        )}
      </PlannerDisclosure>
      {(fromPlaceId || toPlaceId) && PLACE_CATEGORIES.map(category => placeCatalog.sources[category].error && (
        <p role="alert" key={category}>
          Could not load {categoryName(category).toLowerCase()}.{" "}
          <Button size="sm" variant="secondary" onClick={() => placeCatalog.retry(category)}>Retry loading places</Button>
        </p>
      ))}

      {tripState.status === "loading" && (
        <p className="transit-planner-message" role="status">
          Finding trips…
        </p>
      )}
      {tripState.status === "error" && (
        <div className="transit-planner-message" role="alert">
          <p>{tripState.message}</p>
          {(fromLinkedLocation ?? fromParam) && (toLinkedLocation ?? toParam) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTripRetry((value) => value + 1)}
            >
              Retry trip search
            </Button>
          )}
        </div>
      )}
      {tripState.status === "idle" && !fromParam && !toParam && fromLinkedLocation === null && toLinkedLocation === null && (
        <p className="transit-planner-message" role="status">
          Choose an origin and a destination to see trip options.
        </p>
      )}
      {tripState.status === "idle" && Boolean(fromParam || toParam || fromLinkedLocation || toLinkedLocation) && (
        <p className="transit-planner-message" role="status">
          Complete both locations to plan this trip.
        </p>
      )}

      {response?.partial && !inSidebar && (
        <p className="transit-planner-partial" role="status">
          TriMet returned some incomplete itinerary details. Available trip
          information is shown.
        </p>
      )}
      {historyUnavailable && (
        <p role="status">This trip could not be saved to recent journeys on this device.</p>
      )}
      {tripState.status === "empty" && (
        <p className="transit-planner-message" role="status">
          No trips were found between these locations. Try another pair of locations.
        </p>
      )}
      {itineraries.length > 0 && (
        <section
          className="transit-planner-results"
          aria-label="Trip options"
        >
          {editingStops && plannedSearch && (
            <p className="transit-planner-select-hint">
              Showing results for {endpointLabel(plannedSearch.from, response?.from)} to{" "}
              {endpointLabel(plannedSearch.to, response?.to)}.
            </p>
          )}
          {renderMapStatus?.(itineraries, selectedItinerary, highlightedLeg, setMapLeg, catalog?.plannerRouteColors, previewTrip)}
          <PlannerDisclosure title="Choose a trip" onCollapse={clearTripPreview} edit={activeItinerary && !editingTrip ? {
            label: "Edit trip",
            buttonRef: editTripButton,
            onClick: () => setEditingTrip(true),
          } : undefined}>
            {!activeItinerary || editingTrip ? (
              <>
                <ul className="transit-planner-options" aria-label="Available trips">
                  {itineraries.map((itinerary, index) => (
                    <li key={itinerary.id || index}>
                      <button
                        type="button"
                        className="transit-planner-option"
                        aria-current={selectedItinerary === index ? "true" : undefined}
                        ref={selectedItinerary === index ? currentTripOption : undefined}
                        onPointerEnter={event => {
                          if (event.pointerType !== "touch") setHoveredTrip(index);
                        }}
                        onPointerLeave={() => setHoveredTrip(undefined)}
                        onFocus={() => setFocusedTrip(index)}
                        onBlur={() => setFocusedTrip(undefined)}
                        onClick={() => {
                          clearTripPreview();
                          setSelectedItinerary(index);
                          setEditingTrip(false);
                        }}
                      >
                        <TripOptionSummary
                          itinerary={itinerary}
                          index={index}
                          current={selectedItinerary === index}
                          routeColors={catalog?.plannerRouteColors}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                {editingTrip && (
                  <Button type="button" variant="secondary" onClick={() => {
                    clearTripPreview();
                    setEditingTrip(false);
                  }}>
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <div className="transit-planner-summary">
                  <h4>
                    Option {selectedItinerary + 1}
                    {activeItinerary.startTime && activeItinerary.endTime &&
                      ` · ${activeItinerary.startTime}–${activeItinerary.endTime}`}
                  </h4>
                  <p>
                    {activeItinerary.duration !== undefined &&
                      `${activeItinerary.duration} min · `}
                    {transferCount(activeItinerary)}{" "}
                    {transferCount(activeItinerary) === 1 ? "transfer" : "transfers"}
                    {activeItinerary.distance !== undefined &&
                      ` · ${activeItinerary.distance.toFixed(2)} mi`}
                    {activeItinerary.fare !== undefined &&
                      ` · $${activeItinerary.fare.toFixed(2)} regular fare`}
                  </p>
              </div>
            )}
          </PlannerDisclosure>
          {activeItinerary && (
            <ItineraryDetails
              itinerary={activeItinerary}
              index={selectedItinerary}
              routeColors={catalog?.plannerRouteColors}
              highlight={renderMapStatus ? { leg: highlightedLeg, onHover: setHoveredLeg, onFocus: setFocusedLeg } : undefined}
            />
          )}
        </section>
      )}
    </section>
    {inJourney && journeyItinerary && (
      <section className="transit-planner transit-planner--sidebar" aria-label="Journey directions">
        <JourneyDirections
          itinerary={journeyItinerary}
          headingRef={journeyHeading}
          routeColors={catalog?.plannerRouteColors}
        />
      </section>
    )}
    {directionsFooter && activeItinerary && createPortal(
      <Button type="button" onClick={inJourney ? () => setJourneyItinerary(undefined) : openJourney}>
        {inJourney ? "Back to planning" : "Get directions"}
      </Button>,
      directionsFooter
    )}
    </>
  );
}
