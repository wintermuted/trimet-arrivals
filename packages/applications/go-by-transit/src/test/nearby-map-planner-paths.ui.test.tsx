import { vi } from "vitest";
import { act } from "react";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getRouteById } from "../api/trimet/routeConfig";
import { getWalkingPath } from "../api/mapbox/walking";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { buildStopCatalog, getStopCatalog } from "../api/trimet/stopCatalog";
import { planTrip } from "../api/trimet/tripplanner";
import { getRouteGeometry, NEARBY_ROUTE_LINES } from "../view/nearby/util/mapbox/routeLines";
import { setupNearbyMapTest, stops, mockVehicleFollow } from "./nearby-map-test.fixture";

vi.mock("../view/nearby/components/NearbyVehicles", () => ({ default: vi.fn(() => null) }));
vi.mock("../view/nearby/util/useVehiclePositions", () => ({
  useVehiclePositions: () => ({ vehicles: [], rejected: 0, status: "empty", retry: vi.fn() }),
}));
vi.mock("../api/geolocation/getCurrentPosition");
vi.mock("../api/trimet/stops");
vi.mock("../api/trimet/arrivals");
vi.mock("../api/trimet/routeConfig");
vi.mock("../api/trimet/stopCatalog", async () => ({
  ...(await vi.importActual<typeof import("../api/trimet/stopCatalog")>("../api/trimet/stopCatalog")),
  getStopCatalog: vi.fn(),
}));
vi.mock("../api/trimet/tripplanner");
vi.mock("../view/nearby/util/mapbox/routeLines", async () => ({
  ...(await vi.importActual<typeof import("../view/nearby/util/mapbox/routeLines")>("../view/nearby/util/mapbox/routeLines")),
  getRouteGeometry: vi.fn(),
}));
vi.mock("../api/mapbox/walking");
vi.mock("../view/nearby/util/mapbox/routeInfo", () => ({
  highlightRouteInfoStop: vi.fn(),
  showRouteInfo: vi.fn(),
}));
vi.mock("../view/nearby/util/mapbox/initializeMap", () => ({
  initializeMap: vi.fn(),
}));
vi.mock("../view/nearby/components/NearbyPlacesMap", () => ({
  __esModule: true,
  default: vi.fn()
}));
vi.mock("../view/nearby/util/mapbox/currentLocation", () => ({
  initializeCurrentLocationMarker: vi.fn(),
  setCurrentLocationMarker: vi.fn(),
}));
vi.mock("../view/nearby/util/mapbox/stopLocationMarker.util", () => ({
  highlightNearbyStop: vi.fn(),
  removeCurrentLocationMarkers: vi.fn(),
  removeStopLocationLayers: vi.fn(),
  setNearbyStops: vi.fn(),
  showStopDetailMarker: vi.fn(() => vi.fn()),
  updateStopMarkerColor: vi.fn(),
}));
vi.mock("mapbox-gl", () => {
  const Marker = vi.fn();
  return {
    __esModule: true,
    default: { accessToken: "pk.synthetic-test-token", Marker },
    Marker,
    Popup: class {
      content: HTMLElement;
      close: () => void;
      setLngLat() { return this; }
      setDOMContent(content: HTMLElement) { this.content = content; return this; }
      setText(text: string) { this.content = globalThis.document.createElement("div"); this.content.textContent = text; return this; }
      on(_event: string, close: () => void) { this.close = close; return this; }
      addTo() { this.content.ownerDocument.body.appendChild(this.content); return this; }
      isOpen() { return this.content.isConnected; }
      remove() { this.content?.remove(); this.close?.(); }
    },
    LngLatBounds: class {
      extend() { return this; }
    },
  };
});

describe("Nearby planner paths, selection and vehicle following", () => {
  const fixture = setupNearbyMapTest();
  const { map, marker, layers, render, finishMapLoading, button } = fixture;

  it("draws available paths together, highlights the chosen option, and removes only planner paths on exit", async () => {
    mockVehicleFollow();
    const [origin, destination] = [101, 202].map((locid, index) => ({
      ...stops.location[0], locid, desc: `Stop ${locid}`, lng: index * 0.01,
      lat: 0, aliases: [], seq: index + 1, tp: false,
    }));
    const branded = {
      100: { desc: "MAX Blue Line", type: "R", routeColor: "1359AE" },
      190: { desc: "MAX Yellow Line", type: "R", routeColor: "FFC52F" },
      290: { desc: "MAX Orange Line", type: "R", routeColor: "D05F27" },
      194: { desc: "Portland Streetcar - A Loop", type: "R", routeColor: "D91965" },
      2: { desc: "FX2-Division", type: "B", routeColor: "61A60E" }
    };
    const configFor = (id: number) => ({
        id, route: id, desc: "Test route", type: "B", routeColor: "4679AA", routeSortOrder: id,
        ...branded[id],
        dir: [{ dir: 0, desc: "Eastbound", stop: [origin, destination] }]
    });
    vi.mocked(getStopCatalog).mockResolvedValue(buildStopCatalog({
      route: [42, 100, 45, 194, 2, 190, 290].map(configFor),
    }));
    vi.mocked(getRouteById).mockImplementation(async id => ({ route: [configFor(id)] }));
    vi.mocked(getRouteGeometry).mockImplementation(async id => {
      if (id === "45") throw new Error("No shape");
      if (id === "42") return {
        type: "Feature", properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [[[0.01, 0], [0.005, 0.001]], [[0, 0], [0.005, 0.001]], [[0, 0], [0.005, 0.001]]]
        }
      };
      return {
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: [[0, 0], [0.005, Number(id) / 100000], [0.01, 0]] }
      };
    });
    vi.mocked(planTrip).mockResolvedValue({
      success: true, partial: false,
      itineraries: [42, 100, 45, 194, 2, 190, 290].map((id, index) => ({
        id: String(id), duration: 15 + index, partial: false,
        legs: [
          { mode: "Walk", partial: false, from: { lon: 0.01, lat: 0 }, to: { lon: 0.011, lat: 0.001 } },
          {
            mode: "Bus", partial: false, route: { internalNumber: id, number: String(id), name: `Test route ${id}` },
            startTime: "11:58 PM", endTime: "12:11 AM", direction: "Eastbound",
            from: { stopId: origin.locid, description: origin.desc, lon: origin.lng, lat: origin.lat },
            to: { stopId: destination.locid, description: destination.desc, lon: destination.lng, lat: destination.lat }
          },
          ...(id === 45 ? [{
            mode: "Bus", partial: false, route: { internalNumber: 46, number: "46", name: "Test route 46" },
            from: { stopId: destination.locid, description: destination.desc, lon: destination.lng, lat: destination.lat },
            to: { stopId: 303, description: "Stop 303", lon: 0.02, lat: 0 }
          }] : [])
        ]
      }))
    });

    await render("/nearby/planner?from=101&to=202");
    const Marker = (await vi.importMock("mapbox-gl")).Marker;
    await act(async () => finishMapLoading());
    expect(setNearbyStops).not.toHaveBeenCalled();
    expect(Marker).not.toHaveBeenCalled();
    expect(button("Get directions")).toBeUndefined();
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected", ["all", ["==", ["get", "trip"], -1], ["==", ["get", "walk"], false]]);
    const option = (index: number) => fixture.container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button")[index];
    const expectEmphasis = (index: number) => {
      expect(map.setFilter.mock.calls.filter(([layer]) => layer === "planner-itineraries-selected").slice(-1)[0][1])
        .toEqual(["all", ["==", ["get", "trip"], index], ["==", ["get", "walk"], false]]);
    };
    const pointer = (target: HTMLElement, type: string) => {
      act(() => target.dispatchEvent(new MouseEvent(type, { bubbles: true })));
    };
    pointer(option(1), "pointerover");
    expectEmphasis(1);
    expect(button("Get directions")).toBeUndefined();
    expect(Marker).not.toHaveBeenCalled();
    pointer(option(1), "pointerout");
    expectEmphasis(-1);
    act(() => option(0).focus());
    expectEmphasis(0);
    act(() => option(0).blur());
    expectEmphasis(-1);
    const chooseTrip = async (index: number) => {
      const edit = fixture.container.querySelector<HTMLButtonElement>(".transit-planner-results .transit-planner-edit");
      if (edit) act(() => edit.click());
      await act(async () => option(index).click());
    };
    await chooseTrip(0);
    const footer = fixture.container.querySelector(".transit-nearby-planner-footer");
    const getDirections = button("Get directions");
    expect(getDirections.parentElement).toBe(footer);
    const canvas = fixture.container.querySelector(".transit-nearby-map-canvas");
    act(() => getDirections.click());
    const journey = fixture.container.querySelector('[aria-label="Journey directions"]');
    expect(document.activeElement).toBe(journey.querySelector("h2"));
    expect(journey.textContent).toContain("Planned times from TriMet, not live updates.");
    const steps = journey.querySelectorAll("ol > li");
    expect(steps[0].textContent).toContain("Start walking");
    expect(steps[0].textContent).toContain("Time unavailable");
    expect(steps[1].textContent).toContain("Board atStop 101 (101)11:58 PM");
    expect(steps[1].textContent).toContain("Get off atStop 202 (202)12:11 AM");
    expect(steps[1].textContent).toContain("Direction: Eastbound");
    expect(fixture.container.querySelector(".transit-nearby-map-canvas")).toBe(canvas);
    expect(map.removeSource).not.toHaveBeenCalled();
    act(() => button("Back to planning").click());
    expect(fixture.container.querySelector('[aria-label="Journey directions"]')).toBeNull();
    expect(document.activeElement).toBe(button("Get directions"));
    expect(fixture.container.querySelector(".transit-planner-summary").textContent).toContain("Option 1");
    const markerCount = Marker.mock.calls.length;
    act(() => fixture.container.querySelector<HTMLButtonElement>(".transit-planner-results .transit-planner-edit").click());
    expect(option(0).getAttribute("aria-current")).toBe("true");
    pointer(option(1), "pointerover");
    expectEmphasis(1);
    pointer(option(1), "pointerout");
    expectEmphasis(0);
    act(() => option(1).focus());
    expectEmphasis(1);
    act(() => button("Cancel").focus());
    expectEmphasis(0);
    pointer(option(1), "pointerover");
    act(() => button("Cancel").click());
    expectEmphasis(0);
    expect(Marker).toHaveBeenCalledTimes(markerCount);
    const iconColors = () => Array.from(fixture.container.querySelectorAll<SVGElement>(".transit-planner-leg-icon"), icon => icon.style.color);
    expect(fixture.container.querySelector(".transit-planner-leg-icon--walk")).not.toBeNull();
    expect(iconColors()[1]).toBe("rgb(21, 89, 209)");
    expect(Marker).toHaveBeenCalledTimes(2);
    expect(Marker.mock.calls.map(([{ element }]) => element.getAttribute("aria-label"))).toEqual([
      "Board: Test route 42 at Stop 101",
      "Get off: Test route 42 at Stop 202"
    ]);
    const firstMarker: HTMLButtonElement = Marker.mock.calls[0][0].element;
    expect(firstMarker.tagName).toBe("BUTTON");
    firstMarker.click();
    expect(firstMarker.getAttribute("aria-expanded")).toBe("true");
    const popup = document.getElementById(firstMarker.getAttribute("aria-controls"));
    expect(popup.querySelector("strong").textContent).toBe("Stop 101");
    expect(popup.textContent).toContain("Stop ID: 101");
    expect(popup.textContent).toContain("Board: Test route 42");
    firstMarker.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(firstMarker.getAttribute("aria-expanded")).toBe("false");
    expect(popup.isConnected).toBe(false);
    firstMarker.click();
    const secondMarker: HTMLButtonElement = Marker.mock.calls[1][0].element;
    secondMarker.click();
    expect(firstMarker.getAttribute("aria-expanded")).toBe("false");
    expect(secondMarker.getAttribute("aria-expanded")).toBe("true");
    expect(popup.isConnected).toBe(false);
    firstMarker.click();
    expect(map.addSource).toHaveBeenCalledWith("planner-itineraries", expect.objectContaining({
      data: expect.objectContaining({
        features: [
          expect.objectContaining({
            properties: { trip: 0, legIndex: 1, walk: false, color: "#1559d1" },
            geometry: { type: "LineString", coordinates: [[0, 0], [0.005, 0.001], [0.01, 0]] }
          }),
          expect.objectContaining({ properties: { trip: 1, legIndex: 1, walk: false, color: "#1359AE" } }),
          expect.objectContaining({ properties: { trip: 3, legIndex: 1, walk: false, color: "#D91965" } }),
          expect.objectContaining({ properties: { trip: 4, legIndex: 1, walk: false, color: "#61A60E" } }),
          expect.objectContaining({ properties: { trip: 5, legIndex: 1, walk: false, color: "#FFC52F" } }),
          expect.objectContaining({ properties: { trip: 6, legIndex: 1, walk: false, color: "#D05F27" } })
        ]
      })
    }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "planner-itineraries-selected",
      paint: expect.objectContaining({ "line-color": ["get", "color"], "line-width": 5 })
    }));
    expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ padding: 38 }));
    expect(fixture.container.querySelector("p.transit-planner-partial")).toBeNull();
    const [walkLeg, busLeg] = fixture.container.querySelectorAll<HTMLLIElement>(".transit-planner-leg");
    const [start, end] = busLeg.querySelectorAll(".transit-planner-leg-stops .transit-planner-endpoint");
    expect(start.textContent).toContain("Stop 101 (101)");
    expect(end.textContent).toContain("Stop 202 (202)");
    expect(start.querySelector('.transit-planner-endpoint-marker--from[aria-hidden="true"]')).not.toBeNull();
    expect(end.querySelector('.transit-planner-endpoint-marker--to[aria-hidden="true"]')).not.toBeNull();
    const highlighted = "transit-planner-leg--highlighted";
    const highlightFilter = (trip: number, leg: number) => ["all",
      ["==", ["get", "trip"], trip], ["==", ["get", "legIndex"], leg], ["==", ["get", "walk"], false]
    ];
    const highlightLayer = "planner-itineraries-selected-highlight";
    act(() => walkLeg.focus());
    expect(walkLeg.classList.contains(highlighted)).toBe(true);
    act(() => busLeg.focus());
    expect(map.setFilter).toHaveBeenCalledWith(highlightLayer, highlightFilter(0, 1));
    act(() => busLeg.blur());
    expect(map.setFilter).toHaveBeenLastCalledWith(`${highlightLayer}-walk`, expect.arrayContaining([["==", ["get", "legIndex"], -1]]));
    const move = map.on.mock.calls.filter(([event]) => event === "mousemove").pop()[1];
    const leave = map.on.mock.calls.filter(([event]) => event === "mouseout").pop()[1];
    map.queryRenderedFeatures.mockReturnValue([
      { properties: { trip: 1, legIndex: 0 } },
      { properties: { trip: 0, legIndex: 2 } },
      { properties: { trip: 0, legIndex: 1 } },
    ]);
    act(() => move({ point: { x: 10, y: 20 } }));
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ x: 10, y: 20 }, {
      layers: ["planner-itineraries-selected", "planner-itineraries-selected-walk"]
    });
    expect(busLeg.classList.contains(highlighted)).toBe(true);
    act(() => leave());
    expect(busLeg.classList.contains(highlighted)).toBe(false);
    act(() => move({ point: { x: 10, y: 20 } }));
    await chooseTrip(1);
    expect(iconColors()[1]).toBe("rgb(19, 89, 174)");
    expect(fixture.container.querySelector(`.${highlighted}`)).toBeNull();
    expect(map.off).toHaveBeenCalledWith("mousemove", move);
    expect(popup.isConnected).toBe(false);
    expect(marker.remove).toHaveBeenCalledTimes(2);
    expect(Marker.mock.calls.slice(-2).map(([{ element }]) => element.getAttribute("aria-label"))).toEqual([
      "Board: Test route 100 at Stop 101",
      "Get off: Test route 100 at Stop 202"
    ]);
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected", ["all", ["==", ["get", "trip"], 1], ["==", ["get", "walk"], false]]);
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-alternatives", ["all", ["!=", ["get", "trip"], 1], ["==", ["get", "walk"], false]]);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    await act(async () => button("Follow test trip").click());
    expect(layers.has("planner-itineraries-selected")).toBe(false);
    await act(async () => button("Vehicles").click());
    expect(layers.has("planner-itineraries-selected")).toBe(true);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    await chooseTrip(2);
    act(() => button("Get directions").click());
    const transferSteps = fixture.container.querySelectorAll('[aria-label="Journey steps"] li');
    expect(transferSteps).toHaveLength(3);
    expect(transferSteps[1].textContent).toContain("Get off atStop 202 (202)");
    expect(transferSteps[2].textContent).toContain("Board atStop 202 (202)");
    act(() => button("Back to planning").click());
    const transferMarker: HTMLButtonElement = Marker.mock.calls.slice(-2)[0][0].element;
    transferMarker.click();
    const transferPopup = document.getElementById(transferMarker.getAttribute("aria-controls"));
    expect(transferPopup.textContent).toContain("Stop ID: 202");
    expect(Array.from(transferPopup.querySelectorAll("li"), row => row.textContent))
      .toEqual(["Get off: Test route 45", "Board: Test route 46"]);
    expect(getWalkingPath).not.toHaveBeenCalled();
    const walkingGeometry = { type: "LineString" as const, coordinates: [[0.01, 0], [0.0105, 0], [0.011, 0.001]] };
    vi.mocked(getWalkingPath).mockResolvedValue({
      status: "ready", meters: 100, seconds: 80,
      feature: { type: "Feature", properties: {}, geometry: walkingGeometry }
    });
    await act(async () => button("Toggle walking estimates").click());
    expect(getWalkingPath).toHaveBeenCalledTimes(1);
    expect(getWalkingPath).toHaveBeenCalledWith([0.01, 0], [0.011, 0.001], expect.anything());
    expect(map.addSource).toHaveBeenLastCalledWith("planner-itineraries", expect.objectContaining({
      data: expect.objectContaining({
        features: expect.arrayContaining([expect.objectContaining({ properties: { trip: 2, legIndex: 0, walk: true }, geometry: walkingGeometry })])
      })
    }));
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected-walk", ["all", ["==", ["get", "trip"], 2], ["==", ["get", "walk"], true]]);
    await act(async () => button("Toggle walking estimates").click());
    expect(vi.mocked(getWalkingPath).mock.calls[0][2].aborted).toBe(true);
    expect(map.addSource).toHaveBeenLastCalledWith("planner-itineraries", expect.objectContaining({
      data: expect.objectContaining({
        features: expect.not.arrayContaining([expect.objectContaining({ properties: expect.objectContaining({ walk: true }) })])
      })
    }));
    for (const [option, color] of [
      [3, "rgb(217, 25, 101)"],
      [4, "rgb(97, 166, 14)"],
      [5, "rgb(255, 197, 47)"],
      [6, "rgb(208, 95, 39)"],
    ] as const) {
      await chooseTrip(option);
      expect(iconColors()[1]).toBe(color);
    }
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-header a[aria-label="Back"]').click());
    expect(map.removeSource).toHaveBeenCalledWith("planner-itineraries");
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(setNearbyStops).not.toHaveBeenCalled();
    expect(transferPopup.isConnected).toBe(false);
    expect(marker.remove).toHaveBeenCalledTimes(Marker.mock.calls.length);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/simple-routes"]').click());
    expect(setNearbyStops).toHaveBeenCalled();
    expect([...layers]).toEqual([NEARBY_ROUTE_LINES]);
    expect(map.remove).not.toHaveBeenCalled();
  });
});
