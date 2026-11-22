import { vi } from "vitest";
import { Map as MapboxMap, MapLayerMouseEvent, Popup } from "mapbox-gl";
import { getRouteById } from "../api/trimet/routeConfig";
import { RouteDataResultSet } from "../api/trimet/interfaces/routes";
import { VehiclePosition } from "../api/trimet/interfaces/vehicles";
import { createVehicleTooltips } from "../view/nearby/util/mapbox/vehicleTooltip";

vi.mock("mapbox-gl", () => ({ Popup: vi.fn() }));
vi.mock("../api/trimet/routeConfig", () => ({ getRouteById: vi.fn() }));

describe("vehicle hover details", () => {
  const bus: VehiclePosition = {
    id: "4003", type: "bus", routeNumber: 15, direction: 1, tripId: "18314612", blockId: "1547",
    longitude: -122.68, latitude: 45.51, time: 1800000000000, expires: 1800000060000,
    destination: "15 Belmont to Gateway TC",
  };
  const handlers = new Map<string, (event?: MapLayerMouseEvent) => void>();
  const vehicles = new Map<string, VehiclePosition>();
  const canvas = document.createElement("canvas");
  const content = document.createElement("div");
  const popupElement = document.createElement("div");
  const onFollow = vi.fn();
  let closed: () => void;
  let tooltip: ReturnType<typeof createVehicleTooltips>;
  const popup = {
    setLngLat: vi.fn(), setDOMContent: vi.fn(), addTo: vi.fn(),
    remove: vi.fn(), on: vi.fn(), getElement: vi.fn(),
  };
  const map = {
    on: vi.fn(), off: vi.fn(), getCanvas: () => canvas,
    getLayer: () => true, queryRenderedFeatures: () => [],
  };
  const route = (id = 15): RouteDataResultSet => ({
    route: [{
      route: id, id, type: "B", routeColor: "4679AA", routeSortOrder: 1,
      desc: "15-Belmont/NW 23rd", dir: [{ dir: 1, desc: "To Gateway Transit Center", stop: [] }],
    }],
  });
  function show(id = bus.id) {
    handlers.get("mouseenter")({ features: [{ id }] } as MapLayerMouseEvent);
  }
  async function flush() { await Promise.resolve(); await Promise.resolve(); }

  beforeEach(() => {
    handlers.clear();
    vehicles.clear();
    vehicles.set(bus.id, bus);
    content.replaceChildren();
    closed = undefined;
    popup.setLngLat.mockReturnValue(popup);
    popupElement.replaceChildren(content);
    popup.setDOMContent.mockImplementation(element => {
      const close = document.createElement("button");
      close.className = "mapboxgl-popup-close-button";
      close.onclick = () => popup.remove();
      content.replaceChildren(element, close);
      return popup;
    });
    popup.addTo.mockImplementation(() => { document.body.append(popupElement); return popup; });
    popup.remove.mockImplementation(() => { popupElement.remove(); closed?.(); return popup; });
    popup.on.mockImplementation((_name, callback) => { closed = callback; return popup; });
    popup.getElement.mockReturnValue(popupElement);
    vi.mocked(Popup).mockImplementation(function () { return popup as Popup; });
    map.on.mockImplementation((name, layerOrHandler, handler) => {
      handlers.set(typeof layerOrHandler === "function" ? `map:${name}` : name, handler || layerOrHandler);
    });
    map.off.mockImplementation((name, layerOrHandler) => {
      handlers.delete(typeof layerOrHandler === "function" ? `map:${name}` : name);
    });
    vi.mocked(getRouteById).mockResolvedValue(route());
    tooltip = createVehicleTooltips(map as MapboxMap, "vehicle-layer", id => {
      const vehicle = vehicles.get(id);
      return vehicle && { vehicle, point: [vehicle.longitude, vehicle.latitude] };
    }, onFollow);
  });
  afterEach(() => tooltip.dispose());

  it("shows vehicle, route, direction, trip and report time, caching published descriptions", async () => {
    show();
    expect(content.textContent).toContain("Bus 4003");
    expect(content.textContent).toContain("18314612");
    expect(content.textContent).toContain("loading description");
    expect(content.textContent).toContain("15 Belmont to Gateway TC");
    expect(content.textContent).toContain("Position reported");
    await flush();
    expect(content.textContent).toContain("15-Belmont/NW 23rd");
    expect(content.textContent).toContain("To Gateway Transit Center");
    expect(content.textContent).not.toContain("loading description");
    handlers.get("mouseleave")();
    show();
    expect(getRouteById).toHaveBeenCalledTimes(1);
    expect(content.textContent).toContain("To Gateway Transit Center");
  });

  it("shows line names immediately and labels missing data without inventing direction semantics", () => {
    vehicles.set("train", { ...bus, id: "train", type: "rail", routeNumber: 90, direction: undefined, tripId: undefined });
    show("train");
    expect(content.textContent).toContain("Train train");
    expect(content.textContent).toContain("Red");
    expect(content.querySelectorAll("dd")[1].textContent).toBe("Not reported");
    expect(content.querySelectorAll("dd")[2].textContent).toBe("Not reported");
  });

  it("aborts superseded lookups and ignores late route results", async () => {
    let resolve: (value: RouteDataResultSet) => void;
    vi.mocked(getRouteById).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    show();
    const signal = vi.mocked(getRouteById).mock.calls[0][1];
    vehicles.set("rail", { ...bus, id: "rail", type: "rail", routeNumber: 90 });
    show("rail");
    expect(signal.aborted).toBe(true);
    await flush();
    resolve(route());
    await flush();
    expect(content.textContent).toContain("Train rail");
  });

  it("labels unavailable route metadata explicitly and retries on a new hover", async () => {
    vi.mocked(getRouteById).mockRejectedValueOnce(new Error("Service unavailable"));
    show();
    await flush();
    expect(content.textContent).toContain("route details unavailable");
    expect(content.textContent).toContain("Hover again to retry");
    handlers.get("mouseleave")();
    show();
    await flush();
    expect(getRouteById).toHaveBeenCalledTimes(2);
    expect(content.textContent).toContain("To Gateway Transit Center");
  });

  it("follows position updates, treats feed text as text, and closes when a vehicle disappears", () => {
    show();
    vehicles.set(bus.id, { ...bus, longitude: -122.67, destination: '<img src=x onerror="bad()">' });
    tooltip.refresh();
    expect(popup.setLngLat).toHaveBeenLastCalledWith([-122.67, 45.51]);
    expect(content.querySelector("img")).toBeNull();
    expect(content.textContent).toContain("<img");
    vehicles.clear();
    tooltip.refresh();
    expect(canvas.style.cursor).toBe("");
    expect(vi.mocked(getRouteById).mock.calls[0][1].aborted).toBe(true);
  });

  it("supports tap and Escape dismissal and removes all event handlers on disposal", () => {
    handlers.get("click")({ features: [{ id: bus.id }] } as MapLayerMouseEvent);
    expect(popup.addTo).toHaveBeenCalledWith(map);
    handlers.get("mouseleave")();
    expect(canvas.style.cursor).toBe("pointer");
    expect(popupElement.classList.contains("transit-vehicle-popup-sticky")).toBe(true);
    content.querySelector<HTMLButtonElement>(".transit-vehicle-follow").click();
    expect(onFollow).toHaveBeenCalledWith(bus);
    handlers.get("click")({ features: [{ id: bus.id }] } as MapLayerMouseEvent);
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(canvas.style.cursor).toBe("");
    tooltip.dispose();
    expect(handlers.size).toBe(0);
  });

  it("dismisses a pinned popover on an outside map click and disables following unreported trips", () => {
    vehicles.set(bus.id, { ...bus, blockId: undefined });
    handlers.get("click")({ features: [{ id: bus.id }] } as MapLayerMouseEvent);
    expect(content.querySelector<HTMLButtonElement>(".transit-vehicle-follow").disabled).toBe(true);
    handlers.get("map:click")({ point: { x: 0, y: 0 } } as MapLayerMouseEvent);
    expect(canvas.style.cursor).toBe("");
  });

  it("cleans up active details after Mapbox has released its canvas", () => {
    const originalCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";
    show();
    const getCanvas = vi.spyOn(map, "getCanvas").mockReturnValue(undefined);
    const removeListener = vi.spyOn(canvas, "removeEventListener");
    try {
      expect(() => {
        tooltip.dispose();
        tooltip.dispose();
      }).not.toThrow();
      expect(canvas.style.cursor).toBe("crosshair");
      expect(removeListener).toHaveBeenCalledWith("keydown", expect.any(Function));
      expect(handlers.size).toBe(0);
      expect(popupElement.isConnected).toBe(false);
    } finally {
      getCanvas.mockRestore();
      removeListener.mockRestore();
      canvas.style.cursor = originalCursor;
    }
  });

  it("focuses pinned details from a keyboard trigger and preserves focus across updates", async () => {
    const opener = document.body.appendChild(document.createElement("button"));
    try {
      tooltip.openDetails(bus.id, opener);
      expect(document.activeElement).toBe(content.querySelector(".transit-vehicle-follow"));
      await flush();
      expect(document.activeElement).toBe(content.querySelector(".transit-vehicle-follow"));
      vehicles.set(bus.id, { ...bus, blockId: undefined });
      tooltip.refresh();
      const close = content.querySelector(".mapboxgl-popup-close-button");
      expect(document.activeElement).toBe(close);
      close.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });
});
