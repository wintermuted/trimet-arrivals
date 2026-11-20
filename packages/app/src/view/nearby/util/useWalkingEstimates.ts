import { useEffect, useState } from "react";
import {
  getWalkingEstimates,
  WalkingEstimate,
  WalkingStop,
} from "../../../api/mapbox/walking";
import { StopLocation } from "../../../api/trimet/interfaces/types";

interface State {
  key: string;
  status: "off" | "loading" | "ready" | "error";
  estimates: Map<number, WalkingEstimate>;
  error?: string;
}

export default function useWalkingEstimates(
  origin: number[],
  stops: Array<Pick<StopLocation, "lat" | "lng" | "locid">>,
  enabled: boolean
) {
  const key = JSON.stringify({
    origin: origin?.slice(0, 2),
    stops: stops.map(({ lat, lng, locid }) => ({ lat, lng, locid })),
  });
  const [state, setState] = useState<State>({
    estimates: new Map(),
    key,
    status: "off",
  });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ estimates: new Map(), key, status: "off" });
      return;
    }
    const input: {
      origin: number[];
      stops: Array<Pick<StopLocation, "lat" | "lng" | "locid">>;
    } = JSON.parse(key);
    const validStops: WalkingStop[] = [];
    for (const stop of input.stops) {
      if (typeof stop.locid !== "number" || !Number.isSafeInteger(stop.locid) || stop.locid <= 0) {
        setState({
          error: "Walking estimates require valid current-location and stop coordinates.",
          estimates: new Map(),
          key,
          status: "error"
        });
        return;
      }
      validStops.push({ lat: stop.lat, lng: stop.lng, locid: stop.locid });
    }
    const request = new AbortController();
    setState({ estimates: new Map(), key, status: "loading" });
    getWalkingEstimates(input.origin, validStops, request.signal)
      .then((estimates) => {
        if (!request.signal.aborted)
          setState({ estimates, key, status: "ready" });
      })
      .catch((error) => {
        if (!request.signal.aborted)
          setState({
            error:
              error instanceof Error
                ? error.message
                : "Could not load walking estimates.",
            estimates: new Map(),
            key,
            status: "error",
          });
      });
    return () => request.abort();
  }, [enabled, key, retry]);

  const current: State =
    enabled && state.key === key
      ? state
      : {
          estimates: new Map<number, WalkingEstimate>(),
          key,
          status: enabled ? "loading" : "off",
        };
  return { ...current, refresh: () => setRetry((value) => value + 1) };
}
