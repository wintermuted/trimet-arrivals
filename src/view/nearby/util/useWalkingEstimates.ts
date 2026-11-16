import { useEffect, useState } from "react";
import {
  getWalkingEstimates,
  WalkingEstimate,
  WalkingStop,
} from "../../../api/mapbox/walking";

interface State {
  key: string;
  status: "off" | "loading" | "ready" | "error";
  estimates: Map<number, WalkingEstimate>;
  error?: string;
}

export default function useWalkingEstimates(
  origin: number[],
  stops: WalkingStop[],
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
    const input: { origin: number[]; stops: WalkingStop[] } = JSON.parse(key);
    const request = new AbortController();
    setState({ estimates: new Map(), key, status: "loading" });
    getWalkingEstimates(input.origin, input.stops, request.signal)
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
