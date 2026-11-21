import { vehicleIsFresh } from "./vehicleFreshness";
import { useEffect, useRef, useState } from "react";
import { VehicleRequestError } from "./vehicles";
import type { VehicleBounds, VehiclePosition, VehicleSnapshot } from "./interfaces/vehicles";

const POLL_MS = 15000;

export interface VehicleFeed {
  vehicles: VehiclePosition[];
  status: "loading" | "current" | "empty" | "delayed" | "error" | "paused";
  updatedAt?: number;
  rejected: number;
  message?: string;
}

export interface VehicleViewport {
  getBounds(): VehicleBounds;
  subscribeMove(listener: () => void): () => void;
  subscribeRemove(listener: () => void): () => void;
}

export type VehiclePositionRequest = (
  bounds: VehicleBounds | undefined, signal: AbortSignal, vehicleId?: string
) => Promise<VehicleSnapshot>;

export function useVehiclePositions(
  viewport: VehicleViewport | undefined,
  enabled: boolean,
  getVehicles: VehiclePositionRequest,
  vehicleId?: string
) {
  const [feed, setFeed] = useState<VehicleFeed>({ vehicles: [], rejected: 0, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const lastReport = useRef<{ viewport: VehicleViewport; feed: VehicleFeed; clock: { server: number; received: number } }>(undefined);

  useEffect(() => {
    if (!viewport || !enabled) {
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
    if (vehicleId && cached?.viewport === viewport) {
      clock = cached.clock;
      const now = clock.server + Date.now() - clock.received;
      const vehicles = cached.feed.vehicles.filter(vehicle => vehicle.id === vehicleId && vehicleIsFresh(vehicle, now));
      if (vehicles.length) current = { ...cached.feed, vehicles, status: "loading", message: undefined };
    }

    function publish(next: VehicleFeed) {
      current = next;
      if (!disposed) {
        lastReport.current = { viewport, feed: next, clock };
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
        const snapshot = await getVehicles(vehicleId ? undefined : viewport.getBounds(), signal, vehicleId);
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
      unsubscribeMove?.();
      unsubscribeRemove();
      document.removeEventListener("visibilitychange", visibilityChanged);
    }

    publish(current);
    const expiryTimer = setInterval(expire, 1000);
    const unsubscribeMove = vehicleId ? undefined : viewport.subscribeMove(viewportChanged);
    const unsubscribeRemove = viewport.subscribeRemove(dispose);
    document.addEventListener("visibilitychange", visibilityChanged);
    if (document.hidden) visibilityChanged();
    else void refresh();
    return dispose;
  }, [viewport, enabled, attempt, vehicleId, getVehicles]);

  return { ...feed, retry: () => setAttempt(value => value + 1) };
}
