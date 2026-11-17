import { API_ID, BASE_URL } from "./constants";

export interface TripPlannerOptions {
  fromPlace: string;
  toPlace: string;
  signal?: AbortSignal;
}

export interface TripPlannerLocation {
  description?: string;
  stopId?: number;
  stopSequence?: number;
  lat?: number;
  lon?: number;
}

export interface TripPlannerRoute {
  number?: string;
  internalNumber?: number;
  name?: string;
  key?: string;
  direction?: string;
  block?: number;
}

export interface TripPlannerLeg {
  id?: string;
  mode?: string;
  order?: string;
  from?: TripPlannerLocation;
  to?: TripPlannerLocation;
  route?: TripPlannerRoute;
  direction?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  distance?: number;
  partial: boolean;
}

export interface TripPlannerItinerary {
  id?: string;
  viaRoute?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  distance?: number;
  numberOfTransfers?: number;
  walkingTime?: number;
  transitTime?: number;
  waitingTime?: number;
  fare?: number;
  legs: TripPlannerLeg[];
  partial: boolean;
}

export interface TripPlannerResponse {
  success: boolean;
  from?: TripPlannerLocation;
  to?: TripPlannerLocation;
  itineraries: TripPlannerItinerary[];
  errorMessage?: string;
  partial: boolean;
}

function child(parent: Element, name: string): Element | undefined {
  return Array.from(parent.children).find((element) => element.localName === name);
}

function text(parent: Element, name: string): string | undefined {
  const value = child(parent, name)?.textContent?.trim();
  return value || undefined;
}

function numberValue(value?: string): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberText(parent: Element, name: string): number | undefined {
  return numberValue(text(parent, name));
}

function parseLocation(element?: Element): TripPlannerLocation | undefined {
  if (!element) {
    return undefined;
  }
  const position = child(element, "pos");
  return {
    description: text(element, "description"),
    stopId: numberText(element, "stopId"),
    stopSequence: numberText(element, "stopSequence"),
    lat: position && numberText(position, "lat"),
    lon: position && numberText(position, "lon"),
  };
}

function parseLeg(element: Element): TripPlannerLeg {
  const timeDistance = child(element, "time-distance");
  const from = parseLocation(child(element, "from"));
  const to = parseLocation(child(element, "to"));
  const routeElement = child(element, "route");
  const route = routeElement
    ? {
        number: text(routeElement, "number"),
        internalNumber: numberText(routeElement, "internalNumber"),
        name: text(routeElement, "name"),
        key: text(routeElement, "key"),
        direction: text(routeElement, "direction"),
        block: numberText(routeElement, "block"),
      }
    : undefined;
  const mode = element.getAttribute("mode") || undefined;

  return {
    id: element.getAttribute("id") || undefined,
    mode,
    order: element.getAttribute("order") || undefined,
    from,
    to,
    route,
    direction: text(element, "direction"),
    startTime: timeDistance && text(timeDistance, "startTime"),
    endTime: timeDistance && text(timeDistance, "endTime"),
    duration: timeDistance && numberText(timeDistance, "duration"),
    distance: timeDistance && numberText(timeDistance, "distance"),
    partial:
      !from?.description ||
      !to?.description ||
      (!!mode && mode !== "Walk" && !route),
  };
}

function parseItinerary(element: Element): TripPlannerItinerary {
  const timeDistance = child(element, "time-distance");
  const fare = child(element, "fare");
  const legs = Array.from(element.children)
    .filter((childElement) => childElement.localName === "leg")
    .map(parseLeg);

  return {
    id: element.getAttribute("id") || undefined,
    viaRoute: element.getAttribute("viaRoute") || undefined,
    startTime: timeDistance && text(timeDistance, "startTime"),
    endTime: timeDistance && text(timeDistance, "endTime"),
    duration: timeDistance && numberText(timeDistance, "duration"),
    distance: timeDistance && numberText(timeDistance, "distance"),
    numberOfTransfers: timeDistance && numberText(timeDistance, "numberOfTransfers"),
    walkingTime: timeDistance && numberText(timeDistance, "walkingTime"),
    transitTime: timeDistance && numberText(timeDistance, "transitTime"),
    waitingTime: timeDistance && numberText(timeDistance, "waitingTime"),
    fare: fare && numberText(fare, "regular"),
    legs,
    partial:
      !timeDistance ||
      !text(timeDistance, "startTime") ||
      !text(timeDistance, "endTime") ||
      legs.length === 0 ||
      legs.some((leg) => leg.partial),
  };
}

export function parseTripPlannerResponse(xml: string): TripPlannerResponse {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (
    document.getElementsByTagName("parsererror").length > 0 ||
    document.documentElement.localName !== "response"
  ) {
    throw new Error("TriMet returned an unreadable trip-planner response.");
  }

  const root = document.documentElement;
  const itinerariesElement = child(root, "itineraries");
  const itineraries = itinerariesElement
    ? Array.from(itinerariesElement.children)
        .filter((element) => element.localName === "itinerary")
        .map(parseItinerary)
    : [];
  const error = child(root, "error");
  const errorMessage = error && text(error, "message");

  return {
    success: root.getAttribute("success") === "true",
    from: parseLocation(child(root, "from")),
    to: parseLocation(child(root, "to")),
    itineraries,
    errorMessage,
    partial: itineraries.some((itinerary) => itinerary.partial),
  };
}

export async function planTrip({
  fromPlace,
  toPlace,
  signal,
}: TripPlannerOptions): Promise<TripPlannerResponse> {
  const url = new URL("V1/trips/tripplanner", BASE_URL);
  url.searchParams.set("fromPlace", fromPlace);
  url.searchParams.set("toPlace", toPlace);
  url.searchParams.set("format", "xml");
  url.searchParams.set("appID", API_ID);
  url.searchParams.set("maxIntineraries", "6");

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(
      `TriMet trip planning failed (${response.status} ${response.statusText}).`,
    );
  }

  return parseTripPlannerResponse(await response.text());
}
