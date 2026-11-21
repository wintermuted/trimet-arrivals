import { parsePlannerCoordinates } from "@trimet-arrivals/trimet-client";
import type { StopCatalogStop, TripPlannerLocation } from "@trimet-arrivals/trimet-client";
import type { InterestPlace } from "@trimet-arrivals/places/catalog";

export type PlannerEndpoint =
  | { kind: "stop"; stop: StopCatalogStop }
  | { kind: "place" | "coord"; value: string; interestPlace?: InterestPlace };
export type EndpointField = "from" | "to";

export function endpointLabel(endpoint: PlannerEndpoint, resolved?: TripPlannerLocation) {
  if (endpoint.kind === "stop") return `${endpoint.stop.desc} (${endpoint.stop.locid})`;
  if (endpoint.kind === "coord") return endpoint.interestPlace?.name || endpoint.value;
  return resolved?.description || endpoint.value;
}

export function sameEndpointMessage(from: PlannerEndpoint, to: PlannerEndpoint) {
  return from.kind === "stop" && to.kind === "stop"
    ? "Choose two different stops to plan a trip."
    : "Choose two different locations to plan a trip.";
}

export function endpointParams(endpoint: PlannerEndpoint, field: EndpointField): Record<string, string> {
  if (endpoint.kind === "stop") return { [field]: String(endpoint.stop.locid) };
  return {
    [`${field}${endpoint.kind === "coord" ? "Coord" : "Place"}`]: endpoint.value,
    ...(endpoint.interestPlace ? { [`${field}PlaceId`]: endpoint.interestPlace.id } : {})
  };
}

export function locationEndpoint(value: string, coordinates = false): PlannerEndpoint | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (coordinates || /^[+\-.\d\s,]+$/.test(trimmed) || /^[+-]?(?:\d+\.?\d*|\.\d+)\s*,/.test(trimmed)) {
    const point = parsePlannerCoordinates(trimmed);
    return point && { kind: "coord", value: point.join(",") };
  }
  return { kind: "place", value: trimmed };
}
