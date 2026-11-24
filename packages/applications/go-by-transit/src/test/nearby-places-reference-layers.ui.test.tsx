import { vi } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_PLACE_FILTERS, emptyPlaceSources, InterestPlace, PlaceSnapshot } from "@overworld/places/catalog";
import { Popup } from "mapbox-gl";
import NearbyPlaces from "../view/nearby/components/NearbyPlaces";
import NearbyNeighborhoodsMap, { NEIGHBORHOOD_LAYERS, NEIGHBORHOOD_SOURCE } from "../view/nearby/components/NearbyNeighborhoodsMap";
import { NeighborhoodSnapshot, parseNeighborhoodSnapshot, useNeighborhoods } from "@overworld/places/neighborhoods";
import { DEFAULT_LINE_OVERLAYS, LINE_CAUTION_COLOR, LineOverlayCategory, LineOverlaySnapshot, parseLineOverlaySnapshot, useLineOverlay } from "@overworld/places/lineOverlays";
import NearbyLineOverlayMap, { lineOverlaySource } from "../view/nearby/components/NearbyLineOverlayMap";
vi.mock("../view/nearby/util/mapbox/placeIcons", async () => ({
  ...(await vi.importActual<typeof import("../view/nearby/util/mapbox/placeIcons")>("../view/nearby/util/mapbox/placeIcons")),
  createPlaceIconImage: vi.fn(() => ({ width: 48, height: 48, data: new Uint8Array(48 * 48 * 4) }))
}));
vi.mock("mapbox-gl", () => ({ Popup: vi.fn() }));

const park: InterestPlace = {
  id: "portland:park:1", name: "Example Park", category: "park", coordinates: [-122.67, 45.52],
  arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
};
const snapshot: PlaceSnapshot = {
  version: 1, category: "park", retrievedAt: "2026-11-18T12:00:00Z",
  source: "City of Portland", sourceUrl: "https://www.portlandmaps.com/",
  license: "PDDL-1.0", licenseUrl: "https://opendatacommons.org/licenses/pddl/1-0/",
  coverage: "Test parks", places: [park]
};
const neighborhoodSnapshot: NeighborhoodSnapshot = {
  type: "FeatureCollection", version: 1, retrievedAt: snapshot.retrievedAt,
  source: snapshot.source, sourceUrl: snapshot.sourceUrl, license: snapshot.license,
  licenseUrl: snapshot.licenseUrl, coverage: "Neighborhood bylaw boundaries, including shared areas",
  features: [{ type: "Feature", id: "portland:neighborhood:1", properties: { name: "Example", shared: false, areaId: 1 },
    geometry: { type: "Polygon", coordinates: [[[-122.7, 45.5], [-122.6, 45.5], [-122.6, 45.6], [-122.7, 45.5]]] } }]
};
const overlaySnapshot = (category: LineOverlayCategory): LineOverlaySnapshot => ({
  ...neighborhoodSnapshot, category,
  features: [{ type: "Feature", id: `portland:${category}:1`,
    properties: { name: "Example line", kind: "standard", detail: "Source-listed facility" },
    geometry: { type: "LineString", coordinates: [[-122.7, 45.5], [-122.69, 45.51]] } }]
});

describe("Places line overlays and neighborhood layers", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.mocked(Popup).mockImplementation(function () { return {
      setLngLat: vi.fn().mockReturnThis(), setDOMContent: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(), remove: vi.fn()
    } as never; });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each([
    require("../../../../../public/data/places/park-trails.json"),
    require("../../../../../public/data/places/bicycle-network.json"),
    require("../../../../../public/data/places/recommended-bike-routes.json")
  ])("validates all published $category segments and rejects wrong geometries, categories and identities", data => {
    expect(parseLineOverlaySnapshot(data, data.category).features).toHaveLength(data.features.length);
    const example = overlaySnapshot(data.category);
    expect(() => parseLineOverlaySnapshot({ ...example, features: [...example.features, ...example.features] }, data.category)).toThrow();
    expect(() => parseLineOverlaySnapshot({ ...example,
      features: [{ ...example.features[0], geometry: { type: "Point", coordinates: park.coordinates } }] }, data.category)).toThrow();
    expect(() => parseLineOverlaySnapshot({ ...example,
      features: [{ ...example.features[0], id: "portland:park:1" }] }, data.category)).toThrow();
  });

  it.each(["park-trails", "bicycle-network", "recommended-bike-routes"] as const)(
    "loads %s only when enabled and retries failures independently", async category => {
      const originalFetch = global.fetch;
      const fetch = vi.fn().mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue({ ok: true, json: async () => overlaySnapshot(category) });
      global.fetch = fetch;
      function Harness({ enabled }: { enabled: boolean }) {
        const state = useLineOverlay(category, enabled);
        return <button onClick={state.retry}>{state.error ? "Failed" : state.snapshot ? "Loaded" : "Waiting"}</button>;
      }
      try {
        await act(async () => root.render(<Harness enabled={false} />));
        expect(fetch).not.toHaveBeenCalled();
        await act(async () => root.render(<Harness enabled />));
        expect(container.textContent).toBe("Failed");
        await act(async () => container.querySelector("button").click());
        expect(container.textContent).toBe("Loaded");
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining(`/data/places/${category}.json`),
          expect.objectContaining({ cache: "reload" }));
        await act(async () => root.render(<Harness enabled={false} />));
        expect(fetch).toHaveBeenCalledTimes(2);
      } finally { global.fetch = originalFetch; }
    });

  it("keeps line controls, legends and retries independent of place filters and neighborhood loading", () => {
    const onFilters = vi.fn(), onShown = vi.fn(), onRetry = vi.fn();
    const sources = {
      "park-trails": { loading: true, error: false, retry: vi.fn() },
      "bicycle-network": { loading: false, error: true, retry: vi.fn() },
      "recommended-bike-routes": { loading: false, error: false, retry: vi.fn() }
    };
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={onFilters} visiblePlaces={[park]} onSelect={vi.fn()}
      onRetry={vi.fn()} mapReady mapError={false}
      neighborhoods={{ shown: false, onShown: vi.fn(), polygonsShown: false, onPolygonsShown: vi.fn(),
        loading: false, error: false, mapError: false, onRetry: vi.fn() }}
      lineOverlays={{ shown: { "park-trails": true, "bicycle-network": true, "recommended-bike-routes": true },
        sources, mapErrors: DEFAULT_LINE_OVERLAYS, onShown, onRetry }}
    /></MemoryRouter>));
    expect(container.querySelector('[role="status"][aria-label="Loading park trails..."]')).not.toBeNull();
    expect(container.textContent).toContain("Bicycle network could not be loaded");
    expect(container.querySelector("#place-line-overlay-help")).toBeNull();
    const help = container.querySelector<HTMLButtonElement>('button[aria-label="About recommended bike routes"]');
    expect(help.closest("label")).toBeNull();
    act(() => help.focus());
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(container.contains(tooltip)).toBe(false);
    expect(tooltip.textContent).toContain("Optional reference lines, not turn-by-turn routes");
    expect(tooltip.textContent).toContain("Red dashes: difficult, higher-traffic or unclassified connections");
    expect(help.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(onShown).not.toHaveBeenCalled();
    act(() => help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.querySelector(".transit-place-result")).not.toBeNull();
    const toggle = container.querySelector<HTMLInputElement>(".transit-places-line-toggle input");
    act(() => toggle.click());
    expect(onShown).toHaveBeenCalledWith("park-trails", false);
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry bicycle network"]').click());
    expect(onRetry).toHaveBeenCalledWith("bicycle-network");
    expect(onFilters).not.toHaveBeenCalled();
  });

  it("orders line overlays below POIs, restores after style reload, surfaces draw failures and cleans up its own layers", () => {
    const category = "recommended-bike-routes";
    const source = lineOverlaySource(category);
    const sources = new Set<string>();
    const layers = new Set<string>(["nearby-places-park-points"]);
    const listeners = new Map<string, (event?: { error: Error; sourceId: string }) => void>();
    const map = {
      getSource: vi.fn(id => sources.has(id)), addSource: vi.fn(id => sources.add(id)),
      getLayer: vi.fn(id => layers.has(id)), addLayer: vi.fn((layer, _before?: string) => layers.add(layer.id)),
      getStyle: () => ({ layers: [...layers].map(id => ({ id })) }),
      on: vi.fn((name, handler) => listeners.set(name, handler)), off: vi.fn(),
      removeLayer: vi.fn(id => layers.delete(id)), removeSource: vi.fn(id => sources.delete(id))
    };
    const onError = vi.fn();
    const data = overlaySnapshot(category);
    act(() => root.render(<NearbyLineOverlayMap map={map as never} snapshot={data} onError={onError} />));
    expect(map.addLayer.mock.calls.every(call => call[1] === "nearby-places-park-points")).toBe(true);
    for (const [layer] of map.addLayer.mock.calls) {
      expect(layer.paint["line-width"][0]).toBe("interpolate");
      expect(layer.paint["line-width"][2]).toEqual(["zoom"]);
    }
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: source + "-caution",
      filter: ["==", ["get", "kind"], "caution"],
      paint: expect.objectContaining({ "line-color": LINE_CAUTION_COLOR, "line-dasharray": [2, 1], "line-emissive-strength": 1 })
    }), "nearby-places-park-points");
    act(() => listeners.get("error")({ error: new Error("worker failure"), sourceId: source }));
    expect(onError).toHaveBeenLastCalledWith(category, true);
    layers.clear(); layers.add("nearby-places-park-points"); sources.clear();
    act(() => listeners.get("style.load")());
    expect(onError).toHaveBeenLastCalledWith(category, false);
    expect(sources.has(source)).toBe(true);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect([...layers]).toEqual(["nearby-places-park-points"]);
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("error", expect.any(Function));
    map.addLayer.mockImplementation(() => layers);
    act(() => root.render(<NearbyLineOverlayMap map={map as never} snapshot={data} onError={onError} />));
    expect(onError).toHaveBeenLastCalledWith(category, true);
    act(() => root.render(null));
    map.addSource.mockImplementation(() => { throw new Error("draw failed"); });
    act(() => root.render(<NearbyLineOverlayMap map={map as never} snapshot={data} onError={onError} />));
    expect(onError).toHaveBeenLastCalledWith(category, true);
  });

  it("validates neighborhood polygons and rejects malformed geometry or duplicate IDs", () => {
    expect(parseNeighborhoodSnapshot(neighborhoodSnapshot)).toEqual(neighborhoodSnapshot);
    expect(() => parseNeighborhoodSnapshot({ ...neighborhoodSnapshot,
      features: [...neighborhoodSnapshot.features, ...neighborhoodSnapshot.features] })).toThrow();
    expect(() => parseNeighborhoodSnapshot({ ...neighborhoodSnapshot,
      features: [{ ...neighborhoodSnapshot.features[0], geometry: { type: "Point", coordinates: [-122.67, 45.52] } }] })).toThrow();
    expect(() => parseNeighborhoodSnapshot({ ...neighborhoodSnapshot,
      features: [{ ...neighborhoodSnapshot.features[0], geometry: { type: "Polygon", coordinates: [[[1, 2], [3, 4], [5, 6], [1, 2]]] } }] })).toThrow();
  });

  it("keeps the neighborhood toggle and retry independent of place categories and results", () => {
    const onFilters = vi.fn();
    const onShown = vi.fn();
    const onPolygonsShown = vi.fn();
    const onRetry = vi.fn();
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={onFilters} visiblePlaces={[park]} onSelect={vi.fn()}
      onRetry={vi.fn()} mapReady mapError={false}
      neighborhoods={{ shown: true, onShown, polygonsShown: false, onPolygonsShown,
        loading: false, error: true, mapError: false, onRetry }}
    /></MemoryRouter>));
    const control = container.querySelector<HTMLInputElement>(".transit-places-map-layers input");
    expect(control.checked).toBe(true);
    expect(container.textContent).toContain("Neighborhood boundaries could not be loaded");
    expect(container.querySelector(".transit-place-result").textContent).toContain(park.name);
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry neighborhoods"]').click());
    expect(onRetry).toHaveBeenCalledTimes(1);
    act(() => container.querySelector<HTMLInputElement>(".transit-places-polygon-toggle input").click());
    expect(onPolygonsShown).toHaveBeenCalledWith(true);
    expect(onShown).not.toHaveBeenCalled();
    act(() => control.click());
    expect(onShown).toHaveBeenCalledWith(false);
    expect(onFilters).not.toHaveBeenCalled();
  });

  it("loads neighborhoods only when enabled and recovers after an independent fetch failure", async () => {
    const originalFetch = global.fetch;
    const fetch = vi.fn().mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true, json: async () => neighborhoodSnapshot });
    global.fetch = fetch;
    function Harness({ enabled }: { enabled: boolean }) {
      const { snapshot, error, retry } = useNeighborhoods(enabled);
      return <button onClick={retry}>{error ? "Failed" : snapshot ? snapshot.features[0].properties.name : "Waiting"}</button>;
    }
    try {
      await act(async () => root.render(<Harness enabled={false} />));
      expect(fetch).not.toHaveBeenCalled();
      await act(async () => root.render(<Harness enabled />));
      expect(container.textContent).toBe("Failed");
      await act(async () => container.querySelector("button").click());
      expect(container.textContent).toBe("Example");
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("/data/places/neighborhoods.json"),
        expect.objectContaining({ cache: "reload" }));
      await act(async () => root.render(<Harness enabled={false} />));
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("keeps neighborhoods beneath POIs, restores after style changes and removes only its own layers", () => {
    const sources = new Set<string>();
    const layers = new Set<string>(["nearby-places-park-points"]);
    const listeners = new Map<string, () => void>();
    const map = {
      getSource: vi.fn(id => sources.has(id)), addSource: vi.fn(id => sources.add(id)),
      getLayer: vi.fn(id => layers.has(id)), addLayer: vi.fn((layer, _before?: string) => layers.add(layer.id)),
      getStyle: () => ({ layers: [...layers].map(id => ({ id })) }),
      setLayoutProperty: vi.fn(), setPaintProperty: vi.fn(),
      on: vi.fn((name, handler) => listeners.set(name, handler)), off: vi.fn(),
      removeLayer: vi.fn(id => layers.delete(id)), removeSource: vi.fn(id => sources.delete(id))
    };
    const onError = vi.fn();
    act(() => root.render(<NearbyNeighborhoodsMap map={map as never} snapshot={neighborhoodSnapshot} polygonsShown={false} onError={onError} />));
    expect(map.addSource).toHaveBeenCalledWith(NEIGHBORHOOD_SOURCE, expect.objectContaining({ data: neighborhoodSnapshot }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ type: "symbol",
      layout: expect.objectContaining({ "text-field": ["get", "name"] }) }), "nearby-places-park-points");
    expect(map.addLayer.mock.calls.every(call => call[1] === "nearby-places-park-points")).toBe(true);
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(NEIGHBORHOOD_LAYERS[0], "visibility", "none");
    act(() => root.render(<NearbyNeighborhoodsMap map={map as never} snapshot={neighborhoodSnapshot} polygonsShown onError={onError} />));
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(NEIGHBORHOOD_LAYERS[0], "visibility", "visible");
    expect(map.setPaintProperty).toHaveBeenCalledWith(NEIGHBORHOOD_LAYERS[1], "line-width", 2);
    expect(map.setLayoutProperty.mock.calls.every(call => call[0] === NEIGHBORHOOD_LAYERS[0])).toBe(true);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    sources.clear();
    NEIGHBORHOOD_LAYERS.forEach(id => layers.delete(id));
    act(() => listeners.get("style.load")());
    expect(sources.has(NEIGHBORHOOD_SOURCE)).toBe(true);
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(NEIGHBORHOOD_LAYERS[0], "visibility", "visible");
    expect(onError).not.toHaveBeenCalledWith(true);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect([...layers]).toEqual(["nearby-places-park-points"]);
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
  });
});
