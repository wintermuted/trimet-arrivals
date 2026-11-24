import { endpointLabelForRequest, resolveStopReference, sameEndpoint, endpointParams, locationEndpoint, sameEndpointMessage } from "@overworld/journeys";
import type { EndpointField } from "@overworld/journeys";
import { useStopCatalog } from "@overworld/trimet-client/react";
import distance from "@turf/distance";
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import geoLocateCurrentPosition from "../../api/geolocation/geoLocateCurrentPosition";
import { readRecentJourneys, recordRecentJourney, type RecentJourney } from "../../api/localstorage/recentJourneys";
import { plannerTransitColor } from "../../api/trimet/plannerRouteColors";
import { getStopCatalog, type StopCatalogStop } from "../../api/trimet/stopCatalog";
import { planTrip, parsePlannerCoordinates, type TripPlannerItinerary, type TripPlannerLeg } from "../../api/trimet/tripplanner";
import { PLACE_CATEGORIES, placeCategoryForId, usePlaceCatalog, type InterestPlace } from "@overworld/places/catalog";
import { EMPTY_STOPS, coordinateHelp, type PlannedSearch, type TripState, type TripPlannerProps } from "./TripPlannerModel";

function loadRecentTrips() {
  try {
    return { journeys: readRecentJourneys(), unavailable: false };
  } catch {
    return { journeys: [], unavailable: true };
  }
}

export default function useTripPlannerState({ inSidebar = false, directionsFooter }: Pick<TripPlannerProps, "inSidebar" | "directionsFooter">) {
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
  const catalogState = useStopCatalog(getStopCatalog);
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

  const catalog = catalogState.catalog;
  const transitColor = (leg: TripPlannerLeg) => plannerTransitColor(leg, catalog?.plannerRouteColors);
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

  return {
    searchParams, fromParam, toParam, fromPlaceId, toPlaceId, confirmPlace,
    fromNamedPlace, toNamedPlace, placeCatalog, fromLinkedLocation, toLinkedLocation,
    fromInterestPlace, setFromInterestPlace, toInterestPlace, setToInterestPlace,
    fromStop, toStop, fromLocation, setFromLocation, toLocation, setToLocation,
    locating, pendingEndpointFocus, catalogState, catalog, transitColor,
    selectedItinerary, setSelectedItinerary, editingTrip, setEditingTrip,
    setHoveredTrip, setFocusedTrip, journeyItinerary, setJourneyItinerary,
    planningContent, journeyHeading, editTripButton, currentTripOption,
    setHoveredLeg, setFocusedLeg, setMapLeg, setTripRetry, tripState,
    plannedSearch, editingStops, setEditingStops, editStopsButton, searchFields,
    focusBoardingStop, validationError, setValidationError, historyUnavailable,
    recentTrips, cancelLocationLookup, swapEndpoints, useNearestStop, submit,
    chooseStop, chooseRecentTrip, response, stopSummary, itineraries,
    activeItinerary, inJourney, previewTrip, highlightedLeg, clearTripPreview, openJourney,
  };
}

export type TripPlannerState = ReturnType<typeof useTripPlannerState>;
