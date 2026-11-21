import type { TrimetClientOptions } from "./options";
import { requestVehicleData, VehicleRequestError } from "./vehicles";

export interface VehicleTripStop {
  id: string;
  sequence: number;
  name: string;
  passed: boolean;
  status: string;
  scheduled?: number;
  estimated?: number;
}

export interface VehicleTrip {
  tripId: string;
  destination?: string;
  stops: VehicleTripStop[];
  progressAvailable: boolean;
}

export interface VehicleTripSnapshot {
  queryTime: number;
  trip?: VehicleTrip;
  partial: boolean;
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function identifier(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() :
    typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
}

function timestamp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function parseVehicleTrip(value: unknown, blockId: string, tripId: string): VehicleTripSnapshot {
  const result = object(value) && value.resultSet;
  const queryTime = object(result) ? timestamp(result.queryTime) : undefined;
  if (!object(result) || !queryTime || result.error || result.errorMessage ||
      !Array.isArray(result.blockStatus)) {
    throw new VehicleRequestError("TriMet returned invalid trip progress.");
  }
  const block = result.blockStatus.find(entry => object(entry) && identifier(entry.blockID) === blockId);
  if (!block) throw new VehicleRequestError("The selected vehicle block is no longer reported.");
  if (!Array.isArray(block.trip)) throw new VehicleRequestError("Trip stops are unavailable.");
  const raw = block.trip.find(entry => object(entry) && identifier(entry.tripID) === tripId);
  if (!raw) return { queryTime, partial: false };
  if (!Array.isArray(raw.stop)) throw new VehicleRequestError("Trip stops are unavailable.");
  const names = new Map<string, string>();
  for (const location of Array.isArray(result.location) ? result.location : []) {
    if (object(location) && typeof location.desc === "string") {
      const id = identifier(location.locid ?? location.id);
      if (id) names.set(id, location.desc);
    }
  }
  const stops: VehicleTripStop[] = [];
  const sequences = new Set<number>();
  let partial = false;
  for (const stop of raw.stop) {
    if (!object(stop)) throw new VehicleRequestError("A trip stop is malformed.");
    if (stop.passengerAccessible === false) continue;
    const id = identifier(stop.locid);
    if (!id || typeof stop.stopSequence !== "number" || !Number.isInteger(stop.stopSequence) ||
        typeof stop.isPassed !== "boolean" || sequences.has(stop.stopSequence)) {
      throw new VehicleRequestError("Trip stop order or progress is invalid.");
    }
    sequences.add(stop.stopSequence);
    if (!names.has(id)) partial = true;
    stops.push({
      id, sequence: stop.stopSequence,
      name: names.get(id) || `Stop ${id} (name unavailable)`,
      passed: stop.isPassed,
      status: typeof stop.status === "string" ? stop.status : "unknown",
      scheduled: timestamp(stop.aimedArrival) ?? timestamp(stop.aimedDeparture),
      estimated: stop.estimated === true
        ? timestamp(stop.adjustedArrival) ?? timestamp(stop.adjustedDeparture) : undefined,
    });
  }
  return {
    queryTime, partial,
    trip: {
      tripId, destination: typeof raw.destination === "string" ? raw.destination : undefined,
      progressAvailable: typeof raw.progressFeet === "number" && Number.isFinite(raw.progressFeet),
      stops: stops.sort((a, b) => a.sequence - b.sequence),
    },
  };
}

export async function getVehicleTrip(
  blockId: string,
  tripId: string,
  { baseUrl, appId, useFixtures }: TrimetClientOptions,
  signal?: AbortSignal
): Promise<VehicleTripSnapshot> {
  if (!blockId.trim() || !tripId.trim()) throw new VehicleRequestError("Trip and block IDs are required for tracking.", true);
  if (useFixtures) {
    const now = Date.now();
    return {
      queryTime: now, partial: false,
      trip: {
        tripId, destination: "Example destination", progressAvailable: true,
        stops: [0, 1, 2].map(index => ({
          id: String(index + 1), sequence: index + 1, name: `Example stop ${index + 1}`,
          passed: index === 0, status: "normal", scheduled: now + index * 60000,
        })),
      },
    };
  }
  const url = new URL("v2/blockStatus", baseUrl);
  url.searchParams.set("appID", appId);
  url.searchParams.set("blockID", blockId);
  url.searchParams.set("showRoutes", "false");
  url.searchParams.set("showStops", "true");
  return parseVehicleTrip(await requestVehicleData(url, signal), blockId, tripId);
}
