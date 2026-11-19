import { fixtureEnabled } from "../util";
import { API_ID, BASE_URL } from "./constants";
import { vehicleFixtureData } from "./fixture/vehicles";
import { VehicleBounds, VehiclePosition, VehicleSnapshot } from "./interfaces/vehicles";
import { normalizeRouteColor } from "./plannerRouteColors";

export class VehicleRequestError extends Error {
  constructor(message: string, public readonly permanent = false, public readonly retryAfterMs = 0) {
    super(message);
    this.name = "VehicleRequestError";
    Object.setPrototypeOf(this, VehicleRequestError.prototype);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseVehicleSnapshot(value: unknown): VehicleSnapshot {
  const result = record(value) && value.resultSet;
  if (!record(result)) throw new VehicleRequestError("TriMet returned an invalid vehicle response.");
  if (result.error || result.errorMessage) {
    throw new VehicleRequestError("TriMet could not provide vehicle positions.");
  }
  if (!finite(result.queryTime) || result.queryTime <= 0 ||
      (result.vehicle !== undefined && !Array.isArray(result.vehicle))) {
    throw new VehicleRequestError("TriMet returned an invalid vehicle snapshot.");
  }
  const vehicles = new Map<string, VehiclePosition>();
  let rejected = 0;
  // TriMet omits the vehicle property entirely for an empty viewport.
  const entries = Array.isArray(result.vehicle) ? result.vehicle : [];
  for (const raw of entries) {
    if (!record(raw) ||
        !((typeof raw.vehicleID === "string" && raw.vehicleID.trim()) ||
          (finite(raw.vehicleID) && Number.isInteger(raw.vehicleID))) ||
        (raw.type !== "bus" && raw.type !== "rail") ||
        !finite(raw.longitude) || Math.abs(raw.longitude) > 180 ||
        !finite(raw.latitude) || Math.abs(raw.latitude) > 90 ||
        !finite(raw.time) || raw.time <= 0 || raw.time > result.queryTime + 5000 ||
        !finite(raw.expires) || raw.expires < raw.time) {
      rejected += 1;
      continue;
    }
    const vehicle: VehiclePosition = {
      id: String(raw.vehicleID).trim(),
      type: raw.type,
      longitude: raw.longitude,
      latitude: raw.latitude,
      time: raw.time,
      expires: raw.expires,
      bearing: finite(raw.bearing) && raw.bearing >= 0 && raw.bearing < 360 ? raw.bearing : undefined,
      routeNumber: finite(raw.routeNumber) && raw.routeNumber > 0 ? raw.routeNumber : undefined,
      direction: finite(raw.direction) && Number.isInteger(raw.direction) && raw.direction >= 0 ? raw.direction : undefined,
      tripId: typeof raw.tripID === "string" ? raw.tripID.trim() || undefined :
        finite(raw.tripID) ? String(raw.tripID) : undefined,
      blockId: typeof raw.blockID === "string" ? raw.blockID.trim() || undefined :
        finite(raw.blockID) ? String(raw.blockID) : undefined,
      destination: typeof raw.signMessageLong === "string" ? raw.signMessageLong :
        typeof raw.signMessage === "string" ? raw.signMessage : undefined,
      color: normalizeRouteColor(raw.routeColor),
    };
    const previous = vehicles.get(vehicle.id);
    if (!previous || previous.time < vehicle.time) vehicles.set(vehicle.id, vehicle);
  }
  return { queryTime: result.queryTime, vehicles: [...vehicles.values()], rejected };
}

export async function getVehicles(bounds: VehicleBounds | undefined, signal?: AbortSignal, vehicleId?: string): Promise<VehicleSnapshot> {
  const [west, south, east, north] = bounds || [];
  if ((!bounds && !vehicleId) || (bounds && (!bounds.every(finite) || west < -180 || east > 180 ||
      south < -90 || north > 90 || west >= east || south >= north))) {
    throw new VehicleRequestError("The map bounds are not valid for vehicle lookup.", true);
  }
  if (signal?.aborted) throw new DOMException("Vehicle lookup cancelled.", "AbortError");
  if (fixtureEnabled()) {
    const snapshot = vehicleFixtureData(bounds || [-180, -90, 180, 90]);
    return vehicleId ? { ...snapshot, vehicles: snapshot.vehicles.filter(vehicle => vehicle.id === vehicleId) } : snapshot;
  }

  const url = new URL("v2/vehicles", BASE_URL);
  url.searchParams.set("appID", API_ID);
  if (vehicleId) url.searchParams.set("ids", vehicleId);
  else url.searchParams.set("bbox", bounds.join(","));
  url.searchParams.set("onRouteOnly", "true");
  url.searchParams.set("showNonRevenue", "false");
  url.searchParams.set("showStale", "false");
  return parseVehicleSnapshot(await requestVehicleData(url, signal));
}

export async function requestVehicleData(url: URL, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    const retryAfterMs = retry === null ? 0 : /^\d+$/.test(retry.trim())
      ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now());
    throw new VehicleRequestError(
      `Vehicle lookup failed (HTTP ${response.status}).`,
      response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429,
      Number.isFinite(retryAfterMs) ? retryAfterMs : 0
    );
  }
  return response.json();
}
