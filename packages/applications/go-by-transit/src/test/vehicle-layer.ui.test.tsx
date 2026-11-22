import { vi, type Mock } from "vitest";
import { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import { createVehicleLayer } from "../view/nearby/util/mapbox/vehicleLayer";
import { VehiclePosition } from "../api/trimet/interfaces/vehicles";

vi.mock("../view/nearby/util/mapbox/vehicleTooltip", () => ({
  createVehicleTooltips: () => ({ refresh: vi.fn(), hide: vi.fn(), dispose: vi.fn() }),
}));

describe("vehicle symbol layer", () => {
  const bus: VehiclePosition = { id: "bus", type: "bus", longitude: -122.68, latitude: 45.51, time: 1000, expires: 999999, bearing: 90, tripId: "trip" };
  const rail: VehiclePosition = { ...bus, id: "rail", type: "rail" };
  const originalMatchMedia = window.matchMedia;
  const originalPath = window.Path2D;
  const handlers = new Map<string, (event?: { originalEvent?: Event }) => void>();
  const sources = new Map<string, { setData: Mock }>();
  const layers = new Set<string>();
  const images = new Set<string>();
  let time = 0;
  let reduced = false;
  let motionChanged: () => void;
  let scheduled: FrameRequestCallback;
  let layer: ReturnType<typeof createVehicleLayer>;
  const onError = vi.fn();
  const setData = vi.fn();
  const map = {
    on: vi.fn((name, handler) => handlers.set(name, handler)),
    off: vi.fn(name => handlers.delete(name)),
    getSource: vi.fn(id => sources.get(id)),
    addSource: vi.fn(id => sources.set(id, { setData })),
    removeSource: vi.fn(id => sources.delete(id)),
    getLayer: vi.fn(id => layers.has(id)),
    addLayer: vi.fn(({ id }) => layers.add(id)),
    removeLayer: vi.fn(id => layers.delete(id)),
    hasImage: vi.fn(id => images.has(id)),
    addImage: vi.fn(id => images.add(id)),
    removeImage: vi.fn(id => images.delete(id)),
    getCenter: () => ({ lng: 0, lat: 0 }),
    getBearing: vi.fn(),
    getPitch: vi.fn(),
    getZoom: vi.fn(),
    getContainer: vi.fn(),
    easeTo: vi.fn(),
    stop: vi.fn(),
    jumpTo: vi.fn(),
  };
  const lastData = () => setData.mock.calls[setData.mock.calls.length - 1][0];
  const point = (id = "bus") => lastData().features.find(feature => feature.id === id).geometry.coordinates;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear(); sources.clear(); layers.clear(); images.clear();
    map.on.mockImplementation((name, handler) => handlers.set(name, handler));
    map.off.mockImplementation(name => handlers.delete(name));
    map.getSource.mockImplementation(id => sources.get(id));
    map.addSource.mockImplementation(id => sources.set(id, { setData }));
    map.removeSource.mockImplementation(id => sources.delete(id));
    map.getLayer.mockImplementation(id => layers.has(id));
    map.addLayer.mockImplementation(({ id }) => layers.add(id));
    map.removeLayer.mockImplementation(id => layers.delete(id));
    map.hasImage.mockImplementation(id => images.has(id));
    map.addImage.mockImplementation(id => images.add(id));
    map.removeImage.mockImplementation(id => images.delete(id));
    map.getBearing.mockReturnValue(20);
    map.getPitch.mockReturnValue(10);
    map.getZoom.mockReturnValue(14);
    map.getContainer.mockReturnValue({ clientHeight: 600 });
    time = 0;
    reduced = false;
    vi.spyOn(performance, "now").mockImplementation(() => time);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { scheduled = callback; return 1; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() { return reduced; },
      addEventListener: (_name, listener) => { motionChanged = listener; },
      removeEventListener: vi.fn(),
    }));
    window.Path2D = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
      translate: vi.fn(), scale: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
      getImageData: () => ({ width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4) }),
    } as CanvasRenderingContext2D));
    layer = createVehicleLayer(map as MapboxMap, onError, vi.fn());
  });
  afterEach(() => {
    layer.dispose();
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    window.Path2D = originalPath;
    Reflect.deleteProperty(document, "hidden");
  });

  function tick(value: number) {
    time = value;
    scheduled(value);
  }

  it("uses one shared source with distinct bus and rail symbols and a bearing cue", () => {
    layer.update([bus, rail]);
    expect(sources.size).toBe(1);
    expect(map.addImage).toHaveBeenCalledTimes(5);
    expect(lastData().features.map(feature => feature.properties.mode)).toEqual(["bus", "rail"]);
    expect(lastData().features[0].properties.bearing).toBe(90);
    expect(onError).toHaveBeenLastCalledWith(false);
  });

  it("colors badges and route labels to the route and selects contrasting glyphs for bright lines", () => {
    layer.update([
      { ...bus, color: "#C41F3E" },
      { ...rail, color: "#FFC52F" },
    ]);
    expect(lastData().features.map(feature => feature.properties)).toEqual([
      expect.objectContaining({ color: "#C41F3E", glyph: "nearby-vehicle-bus-light", foreground: "#ffffff" }),
      expect.objectContaining({ color: "#FFC52F", glyph: "nearby-vehicle-rail-dark", foreground: "#000000" }),
    ]);
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "nearby-vehicle-badges",
      paint: expect.objectContaining({ "circle-color": ["get", "color"] }),
    }));
  });

  it("uses MAX and Streetcar line names while retaining regular bus numbers", () => {
    const routes = [90, 100, 190, 200, 290, 193, 194, 195, 15];
    layer.update(routes.map(routeNumber => ({
      ...rail, id: String(routeNumber), routeNumber, type: routeNumber === 15 ? "bus" : "rail",
    })));
    expect(lastData().features.map(feature => feature.properties.route)).toEqual([
      "Red", "Blue", "Yellow", "Green", "Orange", "NS Line", "A Loop", "B Loop", "15",
    ]);
  });

  it("briefly interpolates to the exact reported point and ignores older updates", () => {
    layer.update([bus]);
    expect(point()).toEqual([-122.68, 45.51]);
    time = 2000;
    layer.update([{ ...bus, longitude: -122.679, time: 2000 }]);
    tick(2500);
    expect(point()[0]).toBeGreaterThan(-122.68);
    expect(point()[0]).toBeLessThan(-122.679);
    tick(3000);
    expect(point()).toEqual([-122.679, 45.51]);
    layer.update([{ ...bus, longitude: -121, time: 1000 }]);
    expect(point()).toEqual([-122.679, 45.51]);
  });

  it("starts interrupted movement at its displayed position and removes missing IDs", () => {
    layer.update([bus, rail]);
    time = 1000;
    layer.update([{ ...bus, longitude: -122.679, time: 2000 }]);
    tick(1500);
    const displayed = point()[0];
    layer.update([{ ...bus, longitude: -122.678, time: 3000 }]);
    expect(point()[0]).toBe(displayed);
    expect(lastData().features).toHaveLength(1);
    tick(2500);
    expect(point()[0]).toBe(-122.678);
  });

  it("snaps reduced-motion updates, large jumps, and visibility changes", () => {
    layer.update([bus]);
    reduced = true;
    layer.update([{ ...bus, longitude: -122.679, time: 2000 }]);
    expect(point()[0]).toBe(-122.679);
    reduced = false;
    layer.update([{ ...bus, longitude: -120, time: 3000 }]);
    expect(point()[0]).toBe(-120);
    time = 1000;
    layer.update([{ ...bus, longitude: -120.001, time: 4000 }]);
    motionChanged();
    expect(point()[0]).toBe(-120.001);
  });

  it("restores symbols after style reload without removing unrelated map resources", () => {
    layer.update([bus]);
    sources.clear(); layers.clear(); images.clear();
    handlers.get("style.load")();
    expect(lastData().features).toHaveLength(1);
    layers.add("planner-itineraries-selected");
    layer.dispose();
    expect([...layers]).toEqual(["planner-itineraries-selected"]);
    expect(sources.size).toBe(0);
    expect(images.size).toBe(0);
    expect(handlers.size).toBe(0);
  });

  it("does not touch a destroyed map during cleanup and surfaces drawing failures", () => {
    const source = map.getSource("nearby-vehicles") as GeoJSONSource;
    vi.mocked(source.setData).mockImplementationOnce(() => { throw new Error("Source failed"); });
    layer.update([bus]);
    expect(onError).toHaveBeenLastCalledWith(true);
    handlers.get("remove")();
    map.removeSource.mockClear();
    layer.dispose();
    expect(map.removeSource).not.toHaveBeenCalled();
  });

  it("follows reported positions with the marker's easing but never switches to the next trip", () => {
    layer.update([bus]);
    layer.follow({ id: bus.id, tripId: "trip" });
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({
      center: [bus.longitude, bus.latitude], bearing: 0, pitch: 0, offset: [0, 0],
    }));
    time = 2000;
    layer.update([{ ...bus, longitude: -122.679, time: 2000 }]);
    const camera = map.easeTo.mock.calls[map.easeTo.mock.calls.length - 1][0];
    expect(camera.center).toEqual([-122.679, bus.latitude]);
    expect(camera.duration).toBe(1000);
    expect(camera.easing(0.5)).toBe(0.875);
    tick(2500);
    map.easeTo.mockClear();
    layer.update([{ ...bus, tripId: "next-trip", longitude: -122.678, time: 3000 }]);
    expect(map.easeTo).not.toHaveBeenCalled();
    expect(map.stop).toHaveBeenCalled();
    layer.follow(undefined);
  });

  it("offers a pitched, heading-oriented chase camera and returns to a flat north-up view", () => {
    layer.update([bus]);
    layer.follow(bus, "chase");
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({
      center: [bus.longitude, bus.latitude], bearing: 90, pitch: 60, zoom: 17, offset: [0, 108],
    }));
    map.getZoom.mockReturnValue(17);
    layer.follow(bus, "north-up");
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({
      bearing: 0, pitch: 0, zoom: 14, offset: [0, 0],
    }));
  });

  it("takes the shortest turn across north and holds the last reported heading when missing", () => {
    map.getBearing.mockReturnValue(350);
    layer.update([{ ...bus, bearing: 350 }]);
    layer.follow(bus, "chase");
    layer.update([{ ...bus, bearing: 10, time: 2000 }]);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 370 }));
    map.getBearing.mockReturnValue(10);
    layer.update([{ ...bus, bearing: 350, time: 3000 }]);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: -10 }));
    map.getBearing.mockReturnValue(355);
    layer.update([{ ...bus, bearing: undefined, time: 4000 }]);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 350 }));
    layer.update([{ ...bus, bearing: 90, time: 1000 }]);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 350 }));
  });

  it("retains the current orientation when the first report has no heading", () => {
    layer.update([{ ...bus, bearing: undefined }]);
    layer.follow(bus, "chase");
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 20 }));
  });

  it("preserves user zoom in north-up and finishes returning from chase even if a report interrupts", () => {
    layer.update([bus]);
    layer.follow(bus);
    map.getZoom.mockReturnValue(15);
    handlers.get("zoomend")({ originalEvent: new Event("wheel") });
    layer.update([{ ...bus, time: 2000 }]);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 15 }));
    layer.follow(bus, "chase");
    map.getZoom.mockReturnValue(17);
    layer.follow(bus, "north-up");
    map.getZoom.mockReturnValue(16);
    handlers.get("zoomend")({});
    layer.update([{ ...bus, time: 3000 }]);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 15 }));
  });

  it("snaps camera changes for reduced motion and reframes on resize without polling", () => {
    reduced = true;
    layer.update([bus]);
    layer.follow(bus, "chase");
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 0 }));
    map.getContainer.mockReturnValue({ clientHeight: 200 });
    handlers.get("resize")();
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ offset: [0, 36], duration: 0 }));
    map.easeTo.mockClear();
    layer.update([]);
    expect(map.easeTo).not.toHaveBeenCalled();
    expect(map.stop).toHaveBeenCalled();
  });

  it("stops a hidden camera and restores the original camera when following exits or unmounts", () => {
    layer.update([bus]);
    layer.follow(bus, "chase");
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    map.easeTo.mockClear();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(map.easeTo).not.toHaveBeenCalled();
    expect(map.stop).toHaveBeenCalled();
    layer.follow(undefined);
    const original = { center: [0, 0], bearing: 20, pitch: 10, zoom: 14 };
    expect(map.jumpTo).toHaveBeenLastCalledWith(original);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    layer.follow(bus, "chase");
    map.jumpTo.mockClear();
    layer.dispose();
    expect(map.jumpTo).toHaveBeenLastCalledWith(original);
  });
});
