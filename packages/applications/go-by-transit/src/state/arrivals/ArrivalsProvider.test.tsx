import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { ArrivalData } from "../../api/trimet/interfaces/arrivals";
import { getArrivals } from "../../api/trimet/arrivals";
import { arrival1 } from "../../api/trimet/fixture/arrival";
import {
  ArrivalsProvider,
  useArrivalRefreshTime,
  useStopArrivals,
} from "./ArrivalsProvider";

vi.mock("../../api/trimet/arrivals", () => ({ getArrivals: vi.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ArrivalsProvider>{children}</ArrivalsProvider>
);
function data(id: number, desc = `Stop ${id}`): ArrivalData {
  return {
    arrival: [{ ...arrival1, locid: id }],
    detour: [],
    queryTime: "",
    location: [
      { id, desc, dir: "N", lat: 45.5, lng: -122.6, passengerCode: "E" },
    ],
  };
}
function deferred() {
  let resolve: (value: ArrivalData) => void;
  const promise = new Promise<ArrivalData>((complete) => {
    resolve = complete;
  });
  return { promise, resolve: (value: ArrivalData) => resolve(value) };
}

afterEach(() => vi.useRealTimers());

it("deduplicates simultaneous consumers and preserves two stops completing in either order", async () => {
  const first = deferred();
  const second = deferred();
  vi.mocked(getArrivals).mockImplementation((id) =>
    id === "123" ? first.promise : second.promise,
  );
  const { result } = renderHook(
    () => ({
      first: useStopArrivals(123),
      duplicate: useStopArrivals(123),
      second: useStopArrivals(456),
      refreshed: useArrivalRefreshTime(),
    }),
    { wrapper },
  );
  await act(async () => {});
  expect(getArrivals).toHaveBeenCalledTimes(2);
  await act(async () => second.resolve(data(456)));
  expect(result.current.second.stopLocation.desc).toBe("Stop 456");
  expect(result.current.first.loading).toBe(true);
  await act(async () =>
    first.resolve({
      ...data(123),
      location: [
        ...data(123).location,
        ...data(456, "Old unrelated metadata").location,
      ],
    }),
  );
  expect(result.current.first.stopLocation.desc).toBe("Stop 123");
  expect(result.current.duplicate.stopLocation.desc).toBe("Stop 123");
  expect(result.current.second.stopLocation.desc).toBe("Stop 456");
  expect(result.current.refreshed).not.toBe("");
  expect(result.current.first.arrivals).toHaveLength(1);
});

it("ignores stale responses across parameter changes and stop resubscription", async () => {
  const old = deferred();
  const other = deferred();
  const replacement = deferred();
  vi.mocked(getArrivals)
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(other.promise)
    .mockReturnValueOnce(replacement.promise);
  const { result, rerender } = renderHook(({ id }) => useStopArrivals(id), {
    wrapper,
    initialProps: { id: 123 },
  });
  await act(async () => {});
  rerender({ id: 456 });
  await act(async () => {});
  rerender({ id: 123 });
  await act(async () => {});
  await act(async () => replacement.resolve(data(123, "Replacement")));
  await act(async () => {
    old.resolve(data(123, "Stale"));
    other.resolve(data(456));
  });
  expect(result.current.stopLocation.desc).toBe("Replacement");
});

it("keeps polling until the last polling subscriber leaves without duplicate in-flight requests", async () => {
  vi.useFakeTimers();
  const first = deferred();
  vi.mocked(getArrivals)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(data(123));
  const { result, rerender, unmount } = renderHook(
    ({ poll }) => ({
      first: useStopArrivals(123, poll),
      second: useStopArrivals(123, true),
    }),
    { wrapper, initialProps: { poll: true } },
  );
  await act(async () => {});
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(getArrivals).toHaveBeenCalledTimes(1);
  await act(async () => first.resolve(data(123)));
  rerender({ poll: false });
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(getArrivals).toHaveBeenCalledTimes(2);
  expect(result.current.first.loading).toBe(false);
  unmount();
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(getArrivals).toHaveBeenCalledTimes(2);
});

it("retains metadata and the last successful timestamp on failure, then clears the error on retry", async () => {
  vi.mocked(getArrivals)
    .mockResolvedValueOnce(data(123))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(data(123, "Refreshed"));
  const { result } = renderHook(
    () => ({
      stop: useStopArrivals(123),
      time: useArrivalRefreshTime(),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.stop.loading).toBe(false));
  const time = result.current.time;
  await act(async () => result.current.stop.refresh());
  expect(result.current.stop.error).toContain("Please try again");
  expect(result.current.stop.stopLocation.desc).toBe("Stop 123");
  expect(result.current.stop.arrivals).toHaveLength(1);
  expect(result.current.time).toBe(time);
  await act(async () => result.current.stop.refresh());
  expect(result.current.stop.error).toBeUndefined();
  expect(result.current.stop.stopLocation.desc).toBe("Refreshed");
});

it("replaces old arrivals with a successful empty response during refresh", async () => {
  vi.mocked(getArrivals)
    .mockResolvedValueOnce(data(123))
    .mockResolvedValueOnce({
      ...data(123),
      arrival: [],
    });
  const { result } = renderHook(() => useStopArrivals(123), { wrapper });
  await waitFor(() => expect(result.current.arrivals).toHaveLength(1));
  await act(async () => result.current.refresh());
  expect(result.current.arrivals).toEqual([]);
  expect(result.current.error).toBeUndefined();
});

it("reports a malformed response without publishing a successful empty result", async () => {
  vi.mocked(getArrivals).mockResolvedValue({ ...data(123), location: [] });
  const { result } = renderHook(
    () => ({
      stop: useStopArrivals(123),
      time: useArrivalRefreshTime(),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.stop.error).toBeDefined());
  expect(result.current.stop.loading).toBe(false);
  expect(result.current.stop.arrivals).toBeUndefined();
  expect(result.current.time).toBe("");
});

it("starts fresh after unmount/remount and does not request twice during StrictMode replay", async () => {
  vi.mocked(getArrivals).mockResolvedValue(data(123));
  const strictWrapper = ({ children }: { children: React.ReactNode }) => (
    <React.StrictMode>
      <ArrivalsProvider>{children}</ArrivalsProvider>
    </React.StrictMode>
  );
  const first = renderHook(() => useStopArrivals(123), {
    wrapper: strictWrapper,
  });
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  expect(getArrivals).toHaveBeenCalledTimes(1);
  first.unmount();
  const second = renderHook(() => useStopArrivals(123), { wrapper });
  await waitFor(() => expect(second.result.current.loading).toBe(false));
  expect(getArrivals).toHaveBeenCalledTimes(2);
});

it("stops polling when arrivals are hidden even if a metadata consumer remains", async () => {
  vi.useFakeTimers();
  vi.mocked(getArrivals).mockResolvedValue(data(123));
  const { rerender } = renderHook(
    ({ poll }) => ({
      visible: useStopArrivals(123, poll),
      metadata: useStopArrivals(123),
    }),
    { wrapper, initialProps: { poll: true } },
  );
  await act(async () => {});
  rerender({ poll: false });
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(getArrivals).toHaveBeenCalledTimes(1);
});
