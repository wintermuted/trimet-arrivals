import { act, render, screen } from "@testing-library/react";
import { Map as MapboxMap } from "mapbox-gl";
import type { TripPlannerItinerary } from "@overworld/trimet-client";
import { PlannerPaths, type PlannerPathRequest, type PlannerPathsResult } from "../planner";

jest.mock("mapbox-gl", () => {
  const MapMock = jest.fn(), BoundsMock = jest.fn();
  return {
    Map: MapMock, LngLatBounds: BoundsMock,
    configureMocks() {
      const sources = new Set<string>(), layers = new Set<string>();
      const map = {
        addSource: jest.fn(id => sources.add(id)), addLayer: jest.fn(({ id }) => layers.add(id)),
        getSource: jest.fn(id => sources.has(id)), getLayer: jest.fn(id => layers.has(id)),
        removeLayer: jest.fn(id => layers.delete(id)), removeSource: jest.fn(id => sources.delete(id)),
        setFilter: jest.fn(), on: jest.fn(), off: jest.fn(), fitBounds: jest.fn(),
        getContainer: jest.fn(() => ({ clientWidth: 600, clientHeight: 300 })),
      };
      MapMock.mockImplementation(() => map);
      BoundsMock.mockImplementation(() => ({ extend: jest.fn() }));
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
    const resources = jest.requireMock("mapbox-gl").configureMocks();
    const map = jest.mocked(new MapboxMap({ container: document.createElement("div") }));
    const request: jest.MockedFunction<PlannerPathRequest> = jest.fn().mockResolvedValue(paths);
    const props = { map, loadPaths: request, itineraries, selected: 0, walkingEnabled: true, onMapLeg: jest.fn(), renderStatus };
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
    const request: jest.MockedFunction<PlannerPathRequest> = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    const props = { itineraries, selected: 0, walkingEnabled: true, onMapLeg: jest.fn(), renderStatus };
    const result = render(<PlannerPaths {...props} loadPaths={request} />);
    const signal = request.mock.calls[0][1];
    const current = jest.fn().mockResolvedValue({ data: { type: "FeatureCollection", features: [] } });
    await act(async () => result.rerender(<PlannerPaths {...props} loadPaths={current} />));
    expect(signal.aborted).toBe(true);
    expect(request).toHaveBeenCalledWith(itineraries, expect.any(AbortSignal), false);
    await act(async () => finish(paths));
    expect(screen.getByText("0 mapped legs")).toBeInTheDocument();
  });

  it("surfaces provider failures through the required status renderer", async () => {
    const request = jest.fn().mockRejectedValue(new Error("Provider unavailable"));
    await act(async () => render(<PlannerPaths itineraries={itineraries} selected={0} walkingEnabled={false}
      loadPaths={request} onMapLeg={jest.fn()} renderStatus={renderStatus} />));
    expect(screen.getByText("Map failed")).toBeInTheDocument();
  });
});
