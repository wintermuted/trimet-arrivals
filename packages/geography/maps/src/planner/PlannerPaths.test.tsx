import { vi, type MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Map as MapboxMap } from "mapbox-gl";
import type { TripPlannerItinerary } from "@overworld/trimet-client";
import { PlannerPaths, type PlannerPathRequest, type PlannerPathsResult } from "../planner";

vi.mock("mapbox-gl", () => {
  const MapMock = vi.fn(), BoundsMock = vi.fn();
  return {
    Map: MapMock, LngLatBounds: BoundsMock,
    configureMocks() {
      const sources = new Set<string>(), layers = new Set<string>();
      const map = {
        addSource: vi.fn(id => sources.add(id)), addLayer: vi.fn(({ id }) => layers.add(id)),
        getSource: vi.fn(id => sources.has(id)), getLayer: vi.fn(id => layers.has(id)),
        removeLayer: vi.fn(id => layers.delete(id)), removeSource: vi.fn(id => sources.delete(id)),
        setFilter: vi.fn(), on: vi.fn(), off: vi.fn(), fitBounds: vi.fn(),
        getContainer: vi.fn(() => ({ clientWidth: 600, clientHeight: 300 })),
      };
      MapMock.mockImplementation(function () { return map; });
      BoundsMock.mockImplementation(function () { return { extend: vi.fn() }; });
      return { sources, layers };
    },
  };
});

const itineraries: TripPlannerItinerary[] = [{ partial: false, legs: [{ mode: "Walk", partial: false }] }];
const paths: PlannerPathsResult = { data: { type: "FeatureCollection", features: [{
  type: "Feature", properties: { trip: 0, legIndex: 0, walk: true },
  geometry: { type: "LineString", coordinates: [[-122.68, 45.51], [-122.67, 45.52]] },
}] } };
const renderStatus: React.ComponentProps<typeof PlannerPaths>["renderStatus"] = status =>
  <output>{status.mapError ? "Map failed" : `${status.selectedPaths.length} mapped legs`}</output>;

describe("injected planner map renderer", () => {
  it("installs and highlights paths, retains the camera when suspending, and cleans up on unmount", async () => {
    const resources = (await vi.importMock("mapbox-gl")).configureMocks();
    const map = vi.mocked(new MapboxMap({ container: document.createElement("div") }));
    const request: MockedFunction<PlannerPathRequest> = vi.fn().mockResolvedValue(paths);
    const props = { map, loadPaths: request, itineraries, selected: 0, walkingEnabled: true, onMapLeg: vi.fn(), renderStatus };
    let result: ReturnType<typeof render>;
    await act(async () => { result = render(<PlannerPaths {...props} />); });
    expect(request).toHaveBeenCalledWith(itineraries, expect.any(AbortSignal), true);
    expect(screen.getByText("1 mapped legs")).toBeInTheDocument();
    expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: 44, maxZoom: 16, duration: 0 });
    result.rerender(<PlannerPaths {...props} highlightedLeg={0} />);
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected-highlight-walk", ["all",
      ["==", ["get", "trip"], 0], ["==", ["get", "legIndex"], 0], ["==", ["get", "walk"], true],
    ]);
    result.rerender(<PlannerPaths {...props} suspended />);
    expect(resources.layers.size).toBe(0);
    result.rerender(<PlannerPaths {...props} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    result.unmount();
    expect(resources.sources.size).toBe(0);
    expect(resources.layers.size).toBe(0);
    expect(map.off).toHaveBeenCalledWith("mousemove", expect.any(Function));
  });

  it("cancels superseded providers and ignores their late results", async () => {
    let finish: (result: PlannerPathsResult) => void;
    const request: MockedFunction<PlannerPathRequest> = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const props = { itineraries, selected: 0, walkingEnabled: true, onMapLeg: vi.fn(), renderStatus };
    const result = render(<PlannerPaths {...props} loadPaths={request} />);
    const signal = request.mock.calls[0][1];
    const current = vi.fn().mockResolvedValue({ data: { type: "FeatureCollection", features: [] } });
    await act(async () => result.rerender(<PlannerPaths {...props} loadPaths={current} />));
    expect(signal.aborted).toBe(true);
    expect(request).toHaveBeenCalledWith(itineraries, expect.any(AbortSignal), false);
    await act(async () => finish(paths));
    expect(screen.getByText("0 mapped legs")).toBeInTheDocument();
  });

  it("surfaces provider failures through the required status renderer", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Provider unavailable"));
    await act(async () => render(<PlannerPaths itineraries={itineraries} selected={0} walkingEnabled={false}
      loadPaths={request} onMapLeg={vi.fn()} renderStatus={renderStatus} />));
    expect(screen.getByText("Map failed")).toBeInTheDocument();
  });
});
