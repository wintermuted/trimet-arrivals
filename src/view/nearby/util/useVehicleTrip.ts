import { useEffect, useRef, useState } from "react";
import { getVehicleTrip, VehicleTripSnapshot } from "../../../api/trimet/vehicleTrip";
import { VehicleRequestError } from "../../../api/trimet/vehicles";

export function useVehicleTrip(blockId: string, tripId: string, updatedAt: number | undefined, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key?: string; data?: VehicleTripSnapshot; receivedAt?: number; loading: boolean; error?: string;
  }>({ loading: true });
  const key = `${blockId}:${tripId}`;
  const failure = useRef({ key, count: 0, until: 0, permanent: false });

  useEffect(() => {
    if (failure.current.key !== key) failure.current = { key, count: 0, until: 0, permanent: false };
    if (!enabled || document.hidden || !updatedAt || failure.current.permanent || failure.current.until > Date.now()) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
    setState(previous => ({
      ...(previous.key === key ? previous : {}), key, loading: true, error: undefined,
    }));
    void getVehicleTrip(blockId, tripId, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      failure.current = { key, count: 0, until: 0, permanent: false };
      setState({ key, data, receivedAt: Date.now(), loading: false });
    }).catch(error => {
      if (controller.signal.aborted && !timedOut) return;
      const count = failure.current.count + 1;
      const retryAfter = error instanceof VehicleRequestError ? error.retryAfterMs : 0;
      failure.current = {
        key, count, until: Date.now() + Math.max(Math.min(15000 * 2 ** (count - 1), 120000), retryAfter),
        permanent: error instanceof VehicleRequestError && error.permanent,
      };
      setState(previous => ({
        ...previous, key, loading: false,
        error: timedOut ? "Trip progress timed out." : "Trip progress could not be updated.",
      }));
    }).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [key, blockId, tripId, updatedAt, enabled, attempt]);

  const current: typeof state = state.key === key ? state : { loading: true };
  return {
    ...current,
    retry() {
      failure.current = { key, count: 0, until: 0, permanent: false };
      setAttempt(value => value + 1);
    },
  };
}
