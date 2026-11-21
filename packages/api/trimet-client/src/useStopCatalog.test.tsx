import { act, renderHook, waitFor } from "@testing-library/react";
import { useStopCatalog, type StopCatalogRequest } from "./react";
import type { StopCatalog } from "./stopCatalog";

const catalog: StopCatalog & { receivedAt: string; plannerColor: string } = {
  stops: [], routeCount: 1, directionCount: 2, stopReferenceCount: 0,
  incompleteRouteCount: 0, incompleteDirectionCount: 0, incompleteRouteNames: [],
  invalidStopCount: 0, receivedAt: "2026-11-21T17:00:00.000Z", plannerColor: "#123456",
};

describe("injected stop catalog resource", () => {
  it("retains catalog metadata and receipt time through a failed forced refresh", async () => {
    const request: jest.MockedFunction<StopCatalogRequest<typeof catalog>> = jest.fn().mockResolvedValue(catalog);
    const { result } = renderHook(() => useStopCatalog(request));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(request).toHaveBeenCalledWith(false);
    expect(result.current.catalog.plannerColor).toBe("#123456");
    expect(result.current.fetchedAt.toISOString()).toBe(catalog.receivedAt);

    request.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => result.current.refresh());
    expect(request).toHaveBeenLastCalledWith(true);
    expect(result.current).toMatchObject({ catalog, error: true, loading: false });
    expect(result.current.fetchedAt.toISOString()).toBe(catalog.receivedAt);

    await act(async () => result.current.refresh());
    expect(result.current).toMatchObject({ catalog, error: false, loading: false });
  });

  it("ignores superseded results and preserves last-known data during a pending retry", async () => {
    let finish: (value: typeof catalog) => void;
    const request: jest.MockedFunction<StopCatalogRequest<typeof catalog>> = jest.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(catalog);
    const { result } = renderHook(() => useStopCatalog(request));
    expect(result.current.loading).toBe(true);
    await act(async () => result.current.refresh());
    expect(result.current.catalog).toBe(catalog);
    await act(async () => finish({ ...catalog, routeCount: 999 }));
    expect(result.current.catalog).toBe(catalog);

    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    act(() => result.current.refresh());
    expect(result.current).toMatchObject({ catalog, loading: true, error: false });
    await act(async () => finish(catalog));
    expect(result.current.loading).toBe(false);
  });

  it("handles a synchronous loader failure and ignores results after the loader changes", async () => {
    const failing = jest.fn(() => { throw new Error("Missing configuration"); });
    const { result, rerender } = renderHook(
      ({ request }: { request: StopCatalogRequest<typeof catalog> }) => useStopCatalog(request),
      { initialProps: { request: failing } },
    );
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.catalog).toBeUndefined();
    let finish: (value: typeof catalog) => void;
    const pending = jest.fn(() => new Promise<typeof catalog>(resolve => { finish = resolve; }));
    rerender({ request: pending });
    const current = jest.fn().mockResolvedValue(catalog);
    rerender({ request: current });
    await waitFor(() => expect(result.current.catalog).toBe(catalog));
    await act(async () => finish({ ...catalog, routeCount: 999 }));
    expect(result.current.catalog).toBe(catalog);
    expect(result.current.error).toBe(false);
  });
});
