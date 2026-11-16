import { useCallback, useEffect, useRef } from "react";

export default function useStopHighlight(onChange?: (stopId?: number) => void) {
  const hoveredStop = useRef<number | undefined>(undefined);
  const focusedStop = useRef<number | undefined>(undefined);
  const clearHighlight = useCallback(() => {
    hoveredStop.current = undefined;
    focusedStop.current = undefined;
    onChange?.();
  }, [onChange]);

  useEffect(() => clearHighlight, [clearHighlight]);

  function hoverStop(stopId?: number) {
    hoveredStop.current = stopId;
    onChange?.(stopId ?? focusedStop.current);
  }

  function focusStop(stopId?: number) {
    focusedStop.current = stopId;
    onChange?.(hoveredStop.current ?? stopId);
  }

  return { clearHighlight, focusStop, hoverStop };
}
