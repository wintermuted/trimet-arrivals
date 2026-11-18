import { faBus, faPersonWalking, faRoute, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import { Button, FieldGroup } from "@wintermuted/ui-theme/react";
import { MultiSelect } from "@wintermuted/ui-theme/react/select";
import React, { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FontAwesome from "react-fontawesome";
import { useSearchParams } from "react-router-dom";
import { readRecentJourneys, recordRecentJourney, type RecentJourney } from "../../api/localstorage/recentJourneys";
import { PlannerRouteColors, plannerTransitColor } from "../../api/trimet/plannerRouteColors";
import {
  getStopCatalog,
  StopCatalog,
  StopCatalogStop,
} from "../../api/trimet/stopCatalog";
import {
  planTrip,
  TripPlannerItinerary,
  TripPlannerLeg,
  TripPlannerResponse,
} from "../../api/trimet/tripplanner";
import PlannerStopSelect from "./PlannerStopSelect";
import "./TripPlannerView.scss";

const EMPTY_STOPS: StopCatalogStop[] = [];

interface StopResolution {
  matches: StopCatalogStop[];
  stop?: StopCatalogStop;
}

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
  from: StopCatalogStop;
  to: StopCatalogStop;
  response: TripPlannerResponse;
};

function resolveStopReference(
  stops: StopCatalogStop[],
  reference: string,
): StopResolution {
  const query = reference.trim().toLowerCase();
  if (!query) {
    return { matches: [] };
  }
  if (/^\d+$/.test(query)) {
    const stop = stops.find((item) => item.locid === Number(query));
    return { matches: stop ? [stop] : [], stop };
  }

  const matches = stops.filter(
    (stop) =>
      stop.desc.toLowerCase() === query ||
      stop.aliases.some((alias) => alias.toLowerCase() === query),
  );
  return { matches, stop: matches.length === 1 ? matches[0] : undefined };
}

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
                <p className="transit-planner-leg-stops">
                  <span>{formatStop(leg.from)}</span>{" "}
                  <span aria-hidden="true">↓</span>{" "}
                  <span>{formatStop(leg.to)}</span>
                </p>
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

function itineraryLabel(itinerary: TripPlannerItinerary, index: number) {
  const transfers = transferCount(itinerary);
  return [
    `Option ${index + 1}`,
    itinerary.startTime && itinerary.endTime
      ? `${itinerary.startTime} to ${itinerary.endTime}`
      : undefined,
    itinerary.duration !== undefined ? `${itinerary.duration} min` : undefined,
    `${transfers} ${transfers === 1 ? "transfer" : "transfers"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function loadRecentTrips() {
  try {
    return { journeys: readRecentJourneys(), unavailable: false };
  } catch {
    return { journeys: [], unavailable: true };
  }
}

export default function TripPlannerView({ inSidebar = false, directionsFooter, renderMapStatus }: {
  inSidebar?: boolean;
  directionsFooter?: HTMLDivElement;
  renderMapStatus?: (
    itineraries: TripPlannerItinerary[],
    selected: number,
    highlightedLeg: number | undefined,
    onMapLeg: (leg?: number) => void,
    routeColors?: PlannerRouteColors,
    previewTrip?: number
  ) => React.ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const [catalogState, setCatalogState] = useState<CatalogState>({
    error: false,
    loading: true,
  });
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [fromStop, setFromStop] = useState<StopCatalogStop>();
  const [toStop, setToStop] = useState<StopCatalogStop>();
  const [selectedItinerary, setSelectedItinerary] = useState(-1);
  const [editingTrip, setEditingTrip] = useState(false);
  const [hoveredTrip, setHoveredTrip] = useState<number>();
  const [focusedTrip, setFocusedTrip] = useState<number>();
  const [journeyItinerary, setJourneyItinerary] = useState<TripPlannerItinerary>();
  const planningContent = useRef<HTMLElement>(null);
  const journeyHeading = useRef<HTMLHeadingElement>(null);
  const planningScrollTop = useRef<number>();
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

  useEffect(() => {
    if (!catalog) {
      return;
    }

    const from = resolveStopReference(catalog.stops, fromParam);
    const to = resolveStopReference(catalog.stops, toParam);
    setFromStop(from.stop);
    setToStop(to.stop);
    setValidationError("");
  }, [catalog, fromParam, toParam]);

  useEffect(() => {
    setHistoryUnavailable(false);
    setEditingStops(true);
    if (!catalog || !fromParam || !toParam) {
      setTripState({ status: "idle" });
      return;
    }

    const from = resolveStopReference(catalog.stops, fromParam);
    const to = resolveStopReference(catalog.stops, toParam);
    if (!from.stop || !to.stop) {
      setTripState({ status: "idle" });
      return;
    }
    if (from.stop.locid === to.stop.locid) {
      setTripState({
        status: "error",
        message: "Choose two different stops to plan a trip.",
      });
      return;
    }

    const origin = from.stop;
    const destination = to.stop;
    const controller = new AbortController();
    setTripState({ status: "loading" });
    planTrip({
      fromPlace: String(origin.locid),
      toPlace: String(destination.locid),
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        if (!response.success) {
          setTripState({
            status: "error",
            message:
              response.errorMessage ||
              "TriMet could not find a trip for these stops.",
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
        try {
          recordRecentJourney(origin, destination);
          if (inSidebar) setRecentTrips(loadRecentTrips());
        } catch {
          setHistoryUnavailable(true);
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
  }, [catalog, fromParam, toParam, tripRetry, inSidebar]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    if (!fromStop || !toStop) {
      setValidationError("Choose a boarding stop and a destination stop.");
      return;
    }
    if (fromStop.locid === toStop.locid) {
      setValidationError("Choose two different stops to plan a trip.");
      return;
    }

    focusStopSummary.current = true;
    const params = { from: String(fromStop.locid), to: String(toStop.locid) };
    if (params.from === fromParam && params.to === toParam) {
      setTripRetry(value => value + 1);
    } else {
      setSearchParams(params);
    }
  }

  function chooseStop(
    stop: StopCatalogStop | null,
    field: "from" | "to",
  ) {
    if (field === "from") {
      setFromStop(stop ?? undefined);
    } else {
      setToStop(stop ?? undefined);
    }
    setValidationError("");
  }

  function chooseRecentTrip(journey: RecentJourney | null) {
    if (!journey) return;
    focusStopSummary.current = true;
    const { from, to } = journey;
    const params = { from: String(from.locid), to: String(to.locid) };
    if (params.from !== fromParam || params.to !== toParam) {
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
    const reference = isFrom ? fromParam : toParam;
    const referenceResolution =
      catalog && reference
        ? resolveStopReference(catalog.stops, reference)
        : undefined;

    return (
      <div className="transit-planner-stop-field">
        <FieldGroup label={label} htmlFor={id}>
          <PlannerStopSelect
            id={id}
            stops={catalog?.stops ?? EMPTY_STOPS}
            selected={selected}
            loading={catalogState.loading}
            onChange={stop => chooseStop(stop, field)}
          />
        </FieldGroup>
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
    <section
      className={`transit-planner${inSidebar ? " transit-planner--sidebar" : ""}`}
      aria-labelledby="transit-planner-title"
      hidden={inJourney}
      ref={planningContent}
    >
      <PlannerDisclosure title="Plan a trip" headingId="transit-planner-title" edit={stopSummary ? {
        label: "Edit stops",
        buttonRef: editStopsButton,
        onClick: () => {
          focusBoardingStop.current = true;
          setEditingStops(true);
        },
      } : undefined}>
        {stopSummary ? (
            <dl className="transit-planner-stop-summary">
              <dt>Boarding stop</dt>
              <dd>{stopSummary.from.desc} ({stopSummary.from.locid})</dd>
              <dt>Destination stop</dt>
              <dd>{stopSummary.to.desc} ({stopSummary.to.locid})</dd>
            </dl>
        ) : (
          <fieldset ref={searchFields} className="transit-planner-search-fields" disabled={tripState.status === "loading"}
            aria-label="Trip search">
        {!inSidebar && (
          <p className="transit-planner-intro">
            Choose any two TriMet stops. Search by stop name or ID; addresses are
            not supported.
          </p>
        )}

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
          {renderStopField("from")}
          {renderStopField("to")}
          <p className="transit-planner-select-hint">Type a name or ID to search all stops.</p>
          {validationError && (
            <p className="transit-planner-message" role="alert">
              {validationError}
            </p>
          )}
          <Button
            type="submit"
            disabled={!fromStop || !toStop || catalogState.loading}
          >
            Find trips
          </Button>
        </form>
          </fieldset>
        )}
      </PlannerDisclosure>

      {tripState.status === "loading" && (
        <p className="transit-planner-message" role="status">
          Finding trips…
        </p>
      )}
      {tripState.status === "error" && (
        <div className="transit-planner-message" role="alert">
          <p>{tripState.message}</p>
          {fromParam && toParam && (
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
      {tripState.status === "idle" && !fromParam && !toParam && (
        <p className="transit-planner-message" role="status">
          Select a boarding stop and destination to see trip options.
        </p>
      )}
      {tripState.status === "idle" && Boolean(fromParam || toParam) && (
        <p className="transit-planner-message" role="status">
          Choose valid stops from the service-wide catalog to plan this trip.
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
          No trips were found between these stops. Try another pair of stops.
        </p>
      )}
      {itineraries.length > 0 && (
        <section
          className="transit-planner-results"
          aria-label="Trip options"
        >
          {editingStops && plannedSearch && (
            <p className="transit-planner-select-hint">
              Showing results for {plannedSearch.from.desc} ({plannedSearch.from.locid}) to{" "}
              {plannedSearch.to.desc} ({plannedSearch.to.locid}).
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
                        {itineraryLabel(itinerary, index)}
                        {selectedItinerary === index && <span>Current trip</span>}
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
