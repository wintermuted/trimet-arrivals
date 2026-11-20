import { useEffect, useRef, useState } from "react";
import { Map as MapboxMap } from "mapbox-gl";
import { getVehicles, VehicleRequestError } from "../../../api/trimet/vehicles";
import { VehicleBounds, VehiclePosition } from "../../../api/trimet/interfaces/vehicles";

const POLL_MS = 15000;
const MAX_AGE_MS = 90000;

export interface VehicleFeed {
  vehicles: VehiclePosition[];
  status: "loading" | "current" | "empty" | "delayed" | "error" | "paused";
  updatedAt?: number;
  rejected: number;
  message?: string;
}

export function vehicleIsFresh(vehicle: VehiclePosition, now: number) {
  return vehicle.expires > now && now - vehicle.time < MAX_AGE_MS;
}

function viewportBounds(map: MapboxMap): VehicleBounds {
  const bounds = map.getBounds();
  const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;
  const west = wrap(bounds.getWest());
  const east = wrap(bounds.getEast());
  const wholeWorld = bounds.getEast() - bounds.getWest() >= 360 || west > east;
  return [
    wholeWorld ? -180 : west, Math.max(-90, bounds.getSouth()),
    wholeWorld ? 180 : east, Math.min(90, bounds.getNorth()),
  ];
}

export function useVehiclePositions(map: MapboxMap | undefined, enabled: boolean, vehicleId?: string) {
  const [feed, setFeed] = useState<VehicleFeed>({ vehicles: [], rejected: 0, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const lastReport = useRef<{ map: MapboxMap; feed: VehicleFeed; clock: { server: number; received: number } }>();

  useEffect(() => {
    if (!map || !enabled) {
      lastReport.current = undefined;
      setFeed({ vehicles: [], rejected: 0, status: "loading" });
      return;
    }
    let disposed = false;
    let generation = 0;
    let failures = 0;
    let retryNotBefore = 0;
    let permanentFailure = false;
    let nextRequest: ReturnType<typeof setTimeout>;
    let timeout: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    let clock = { server: Date.now(), received: Date.now() };
    let current: VehicleFeed = { vehicles: [], rejected: 0, status: "loading" };
    const cached = lastReport.current;
    if (vehicleId && cached?.map === map) {
      clock = cached.clock;
      const now = clock.server + Date.now() - clock.received;
      const vehicles = cached.feed.vehicles.filter(vehicle => vehicle.id === vehicleId && vehicleIsFresh(vehicle, now));
      if (vehicles.length) current = { ...cached.feed, vehicles, status: "loading", message: undefined };
    }

    function publish(next: VehicleFeed) {
      current = next;
      if (!disposed) {
        lastReport.current = { map, feed: next, clock };
        setFeed(next);
      }
    }

    function cancel() {
      generation += 1;
      controller?.abort();
      clearTimeout(timeout);
      clearTimeout(nextRequest);
    }

    function schedule(delay: number) {
      clearTimeout(nextRequest);
      if (!disposed && !document.hidden && !permanentFailure) {
        nextRequest = setTimeout(refresh, Math.max(delay, retryNotBefore - Date.now()));
      }
    }

    function expire() {
      const now = clock.server + Date.now() - clock.received;
      const vehicles = current.vehicles.filter(vehicle => vehicleIsFresh(vehicle, now));
      if (vehicles.length !== current.vehicles.length) {
        publish({
          ...current, vehicles,
          status: current.status === "current" ? "delayed" : current.status,
          message: "Some vehicle positions expired. Waiting for fresh reports.",
        });
      }
    }

    async function refresh() {
      if (disposed || document.hidden || permanentFailure) return;
      cancel();
      const request = generation;
      controller = new AbortController();
      const signal = controller.signal;
      let timedOut = false;
      timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
      try {
        const snapshot = await getVehicles(vehicleId ? undefined : viewportBounds(map), signal, vehicleId);
        if (disposed || signal.aborted || generation !== request) return;
        const previous = new Map(current.vehicles.map(vehicle => [vehicle.id, vehicle]));
        clock = { server: snapshot.queryTime, received: Date.now() };
        let expired = 0;
        const vehicles = snapshot.vehicles.map(vehicle => {
          const cached = previous.get(vehicle.id);
          return cached && cached.time > vehicle.time ? cached : vehicle;
        }).filter(vehicle => {
          if (vehicleIsFresh(vehicle, snapshot.queryTime)) return true;
          expired += 1;
          return false;
        });
        failures = 0;
        retryNotBefore = 0;
        publish({
          vehicles, rejected: snapshot.rejected, updatedAt: Date.now(),
          status: expired || snapshot.rejected ? "delayed" : vehicles.length ? "current" : "empty",
          message: snapshot.rejected ? "Some vehicle reports could not be displayed." :
            expired ? "Some vehicles have no recent position report." : undefined,
        });
        schedule(POLL_MS);
      } catch (error) {
        if (disposed || generation !== request || (signal.aborted && !timedOut)) return;
        failures += 1;
        permanentFailure = error instanceof VehicleRequestError && error.permanent;
        const retryAfter = error instanceof VehicleRequestError ? error.retryAfterMs : 0;
        const delay = Math.max(Math.min(POLL_MS * 2 ** (failures - 1), 120000), retryAfter);
        retryNotBefore = Date.now() + delay;
        expire();
        publish({
          ...current, status: "error",
          message: permanentFailure ? "Vehicle access is unavailable. Try again later." :
            timedOut ? "Vehicle updates timed out. Retrying shortly." :
              "Vehicle updates are unavailable. Retrying shortly.",
        });
        if (!permanentFailure) schedule(delay);
      } finally {
        if (generation === request) clearTimeout(timeout);
      }
    }

    function viewportChanged() {
      cancel();
      expire();
      schedule(250);
    }

    function visibilityChanged() {
      cancel();
      expire();
      if (document.hidden) {
        publish({ ...current, status: "paused", message: "Vehicle updates paused while this tab is hidden." });
      } else {
        publish({ ...current, status: permanentFailure ? "error" : "loading", message: undefined });
        schedule(0);
      }
    }

    function dispose() {
      disposed = true;
      cancel();
      clearInterval(expiryTimer);
      map.off("moveend", viewportChanged);
      map.off("remove", dispose);
      document.removeEventListener("visibilitychange", visibilityChanged);
    }

    publish(current);
    const expiryTimer = setInterval(expire, 1000);
    if (!vehicleId) map.on("moveend", viewportChanged);
    map.on("remove", dispose);
    document.addEventListener("visibilitychange", visibilityChanged);
    if (document.hidden) visibilityChanged();
    else void refresh();
    return dispose;
  }, [map, enabled, attempt, vehicleId]);

  return { ...feed, retry: () => setAttempt(value => value + 1) };
}
