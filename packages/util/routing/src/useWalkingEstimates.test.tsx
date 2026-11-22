import { vi, type MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { WalkingEstimate } from "./walking";
import { useWalkingEstimates } from "./react";
import type { WalkingEstimateInput, WalkingEstimateRequest } from "./react";

describe("walking estimates hook", () => {
  const stop = { locid: 101, lat: 45.5, lng: -122.6 };
  let request: MockedFunction<WalkingEstimateRequest>;
  let walking: ReturnType<typeof useWalkingEstimates>;

  function Harness({ origin = [-122.7, 45.6], stops = [stop], enabled = true }: {
    origin?: number[]; stops?: WalkingEstimateInput[]; enabled?: boolean;
  }) {
    walking = useWalkingEstimates(origin, stops, enabled, request);
    return <output>{walking.status}: {walking.error} {walking.estimates.size}</output>;
  }

  beforeEach(() => {
    request = vi.fn().mockResolvedValue(new Map([[101, { status: "ready", meters: 100, seconds: 80 }]]));
  });

  it("waits for opt-in and reports invalid stop IDs without requesting routes", async () => {
    const { rerender } = render(<Harness enabled={false} />);
    expect(screen.getByText("off: 0")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    rerender(<Harness stops={[{ lat: 45.5, lng: -122.6 }]} />);
    expect(screen.getByText(/error: Walking estimates require valid/)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await act(async () => { rerender(<Harness />); });
    expect(screen.getByText("ready: 1")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith([-122.7, 45.6], [stop], expect.any(AbortSignal));
  });

  it("cancels changed input and ignores late results without refetching equivalent inputs", async () => {
    let finish: (value: Map<number, WalkingEstimate>) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { rerender, unmount } = render(<Harness />);
    const firstSignal = request.mock.calls[0][2];
    rerender(<Harness stops={[{ ...stop }]} />);
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => { rerender(<Harness origin={[-122.8, 45.7]} />); });
    expect(firstSignal.aborted).toBe(true);
    expect(walking.estimates.size).toBe(1);
    await act(async () => { finish(new Map()); });
    expect(walking.estimates.size).toBe(1);
    const secondSignal = request.mock.calls[1][2];
    unmount();
    expect(secondSignal.aborted).toBe(true);
  });

  it("surfaces request failures, supports retry, and clears estimates when disabled", async () => {
    request.mockRejectedValueOnce(new Error("Walking access unavailable"));
    const { rerender } = render(<Harness />);
    await act(async () => {});
    expect(screen.getByText(/error: Walking access unavailable/)).toBeInTheDocument();
    await act(async () => { walking.refresh(); });
    expect(screen.getByText("ready: 1")).toBeInTheDocument();
    rerender(<Harness enabled={false} />);
    expect(screen.getByText("off: 0")).toBeInTheDocument();
    expect(request.mock.calls[1][2].aborted).toBe(true);
  });
});
