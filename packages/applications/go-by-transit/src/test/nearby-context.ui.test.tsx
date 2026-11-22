import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Popup } from "mapbox-gl";
import { MemoryRouter } from "react-router-dom";
import {
  CONTEXT_CATEGORIES, ContextCategory, ContextFeatures, ContextIndex, MapBounds,
  parseContextIndex, parseContextTile, useContextOverlay, DEFAULT_CONTEXT_OVERLAYS
} from "@overworld/places/contextOverlays";
import NearbyContextMap, { contextSource } from "../view/nearby/components/NearbyContextMap";
import NearbyPlaces from "../view/nearby/components/NearbyPlaces";
import { DEFAULT_PLACE_FILTERS, emptyPlaceSources } from "@overworld/places/catalog";

jest.mock("mapbox-gl", () => ({ Popup: jest.fn() }));
const feature = (category: ContextCategory, id = 1): ContextFeatures["features"][number] => ({
  type: "Feature", id: `portland:${category}:${id}`, properties: { name: "Inventory item", detail: "Source context" },
  geometry: category === "sidewalks" ?
    { type: "Polygon", coordinates: [[[-122.67, 45.52], [-122.669, 45.52], [-122.669, 45.521], [-122.67, 45.52]]] } :
    { type: "Point", coordinates: [-122.67, 45.52] }
});
const indexFor = (category: ContextCategory): ContextIndex => ({
  version: 1, category, retrievedAt: "2026-11-19T12:00:00Z", source: "City of Portland",
  sourceUrl: "https://www.portlandmaps.com/", license: "PDDL-1.0", licenseUrl: "https://www.portlandmaps.com/license",
  coverage: "Inventory, not current access.", count: 1,
  tiles: [{ file: `${category}-13-9-0123456789ab.json`, count: 1, bounds: [-122.68, 45.51, -122.66, 45.53] }]
});
const area: MapBounds = [-122.7, 45.5, -122.65, 45.54];

describe("Viewport-loaded walking and street-tree context", () => {
  let container: HTMLDivElement, root: Root;
  beforeEach(() => {
    jest.mocked(Popup).mockImplementation(() => ({
      setLngLat: jest.fn().mockReturnThis(), setDOMContent: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(), remove: jest.fn()
    } as never));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it.each(CONTEXT_CATEGORIES)("validates published %s indexes and tile geometry without allowing arbitrary paths", category => {
    const raw = require(`../../../../../public/data/places/${category}.json`);
    const index = parseContextIndex(raw, category);
    const tile = index.tiles[0];
    expect(parseContextTile(require(`../../../../../public/data/places/${tile.file}`), category, tile).features).toHaveLength(tile.count);
    expect(() => parseContextIndex({ ...index, tiles: [{ ...tile, file: "../elsewhere.json" }] }, category)).toThrow();
    expect(() => parseContextIndex({ ...index, count: index.count + 1 }, category)).toThrow();
    expect(() => parseContextTile({ type: "FeatureCollection", features: [{
      ...feature(category), geometry: { type: "Point", coordinates: [0, 0] }
    }] }, category, indexFor(category).tiles[0])).toThrow();
  });
  it("explains zoom thresholds and independent loading/retry without changing point filters", () => {
    const source = { loading: false, error: false, zoomRequired: false, retry: jest.fn() };
    const onShown = jest.fn(), onRetry = jest.fn(), onFilters = jest.fn();
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={onFilters} visiblePlaces={[]} onSelect={jest.fn()}
      onRetry={jest.fn()} mapReady mapError={false}
      neighborhoods={{ shown: false, onShown: jest.fn(), polygonsShown: false, onPolygonsShown: jest.fn(),
        loading: false, error: false, mapError: false, onRetry: jest.fn() }}
      contextOverlays={{ shown: { "street-trees": true, sidewalks: true, crossings: true, "crossing-deficiencies": true },
        sources: { "street-trees": { ...source, zoomRequired: true }, sidewalks: { ...source, error: true },
          crossings: { ...source, loading: true }, "crossing-deficiencies": source },
        mapErrors: DEFAULT_CONTEXT_OVERLAYS, onShown, onRetry }} /></MemoryRouter>));
    expect(container.textContent).toContain("Zoom in to level 14");
    const warning = container.querySelector<HTMLButtonElement>('button[aria-label="Street trees warning"]');
    expect(warning.closest(".transit-places-layer-row").querySelector('button[aria-label^="Retry"]')).toBeNull();
    expect(container.querySelector(".transit-places-map-layers > p")).toBeNull();
    act(() => warning.focus());
    expect(document.querySelector('[role="tooltip"]').textContent).toBe("Zoom in to level 14 or closer to see street trees.");
    expect(container.querySelector('[role="status"][aria-label="Loading pedpdx crossings..."]')).not.toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="About crossing deficiencies"]').focus());
    expect(document.querySelector('[role="tooltip"]').textContent).toContain("not live closures");
    act(() => container.querySelector<HTMLInputElement>(".transit-places-context-toggle input").click());
    expect(onShown).toHaveBeenCalledWith("street-trees", false);
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry sidewalks"]').click());
    expect(onRetry).toHaveBeenCalledWith("sidewalks");
    expect(onFilters).not.toHaveBeenCalled();
  });

  it("downloads nothing while disabled or zoomed out, fetches only intersecting tiles, and retains explicit failure/retry state", async () => {
    const category = "street-trees";
    const index = indexFor(category);
    index.count = 2;
    index.tiles.push({ file: `${category}-24-12-abcdef012345.json`, count: 1, bounds: [-122.41, 45.59, -122.39, 45.61] });
    const otherArea: MapBounds = [-122.42, 45.58, -122.38, 45.62];
    const second = { ...feature(category, 2), geometry: { type: "Point", coordinates: [-122.4, 45.6] } };
    const originalFetch = global.fetch;
    let fail = true;
    const fetch = jest.fn(async (url: string) => {
      if (url.endsWith(`${category}.json`)) return { ok: true, json: async () => index };
      if (url.includes("24-12") && fail) throw new Error("Tile unavailable");
      return { ok: true, json: async () => ({ type: "FeatureCollection",
        features: [url.includes("24-12") ? second : feature(category)] }) };
    });
    global.fetch = fetch as never;
    let state: ReturnType<typeof useContextOverlay>;
    function Harness({ enabled, zoom, bounds }: { enabled: boolean; zoom: number; bounds: MapBounds }) {
      state = useContextOverlay(category, enabled, bounds, zoom);
      return <button onClick={state.retry}>{state.error ? "Failed" : state.snapshot?.features[0]?.id || "Waiting"}</button>;
    }
    try {
      await act(async () => root.render(<Harness enabled={false} zoom={14} bounds={area} />));
      await act(async () => root.render(<Harness enabled zoom={13} bounds={area} />));
      expect(fetch).not.toHaveBeenCalled();
      expect(state.zoomRequired).toBe(true);
      await act(async () => root.render(<Harness enabled zoom={14} bounds={area} />));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(state.snapshot.features).toHaveLength(1);
      expect(container.textContent).toBe("portland:street-trees:1");
      await act(async () => root.render(<Harness enabled zoom={14} bounds={otherArea} />));
      expect(container.textContent).toBe("Failed");
      expect(state.snapshot.features[0].id).toBe("portland:street-trees:1");
      fail = false;
      await act(async () => container.querySelector("button").click());
      expect(container.textContent).toBe("portland:street-trees:2");
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("24-12"),
        expect.objectContaining({ cache: "reload" }));
      await act(async () => root.render(<Harness enabled zoom={13} bounds={otherArea} />));
      expect(state.snapshot).toBeUndefined();
    } finally { global.fetch = originalFetch; }
  });

  it("orders mixed geometry below line overlays and POIs, restores on style reload and cleans up only its own sources", () => {
    const base = ["nearby-lines-park-trails-halo", "nearby-places-park-points"];
    let layers = [...base];
    const sources = new Map<string, { setData: jest.Mock }>();
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const map = {
      getSource: jest.fn(id => sources.get(id)),
      addSource: jest.fn(id => sources.set(id, { setData: jest.fn() })),
      getLayer: jest.fn(id => layers.includes(id)),
      addLayer: jest.fn((layer, before) => {
        const index = layers.indexOf(before);
        layers.splice(index < 0 ? layers.length : index, 0, layer.id);
      }),
      getStyle: () => ({ layers: layers.map(id => ({ id })) }),
      on: jest.fn((event, ...args) => {
        const key = args.length === 2 ? `${event}:${args[0]}` : event;
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key).add(args[args.length - 1]);
      }), off: jest.fn(),
      removeLayer: jest.fn(id => { layers = layers.filter(layer => layer !== id); }),
      removeSource: jest.fn(id => sources.delete(id)),
      queryRenderedFeatures: jest.fn(() => [{ source: contextSource("street-trees"),
        properties: { name: "<not-markup>", detail: "Source-listed inventory" } }])
    };
    const onError = jest.fn();
    act(() => root.render(<>{CONTEXT_CATEGORIES.map(category =>
      <NearbyContextMap key={category} map={map as never}
        snapshot={{ type: "FeatureCollection", category, features: [feature(category)] }} onError={onError} />)}</>));
    expect(layers).toEqual(["sidewalks", "street-trees", "crossings", "crossing-deficiencies"]
      .map(category => `nearby-context-${category}-features`).concat(base));
    expect(map.addLayer.mock.calls.find(([layer]) => layer.type === "fill")[0].paint["fill-emissive-strength"]).toBe(1);
    onError.mockClear();
    for (const listener of listeners.get("error")) listener({ sourceId: contextSource("sidewalks") });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenLastCalledWith("sidewalks", true);
    for (const listener of listeners.get(`mousemove:${contextSource("street-trees")}-features`)) {
      listener({ point: { x: 1, y: 1 }, lngLat: { lng: -122.67, lat: 45.52 } });
    }
    const popup = jest.mocked(Popup).mock.results[0].value;
    const content = popup.setDOMContent.mock.calls[0][0];
    expect(content.querySelector("not-markup")).toBeNull();
    expect(content.textContent).toContain("<not-markup>");
    sources.clear(); layers = [...base];
    for (const listener of listeners.get("style.load")) listener();
    expect(sources.size).toBe(4);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect(layers).toEqual(base);
  });
});
