import { vi, type Mock, type Mocked } from "vitest";
import { act, render } from "@testing-library/react";
import { Map as MapboxMap, Popup } from "mapbox-gl";
import type { InterestPlace } from "@overworld/places/catalog";
import type { NeighborhoodSnapshot } from "@overworld/places/neighborhoods";
import type { LineOverlaySnapshot } from "@overworld/places/lineOverlays";
import type { ContextSnapshot } from "@overworld/places/contextOverlays";
import { PlacesMap, NeighborhoodsMap, LineOverlayMap, ContextOverlayMap } from "../places";

vi.mock("mapbox-gl", () => {
  const MapMock = vi.fn(), PopupMock = vi.fn();
  return {
    Map: MapMock, Popup: PopupMock,
    configureMocks() {
      const sources = new Map<string, { setData: Mock }>();
      const layers = new Set<string>(), images = new Set<string>();
      const canvas = globalThis.document.createElement("div");
      const map = {
        addSource: vi.fn(id => { sources.set(id, { setData: vi.fn() }); return map; }),
        addLayer: vi.fn(({ id }) => { layers.add(id); return map; }),
        getSource: vi.fn(id => sources.get(id)), getLayer: vi.fn(id => layers.has(id)),
        removeLayer: vi.fn(id => { layers.delete(id); return map; }),
        removeSource: vi.fn(id => { sources.delete(id); return map; }),
        hasImage: vi.fn(id => images.has(id)), addImage: vi.fn(id => images.add(id)),
        removeImage: vi.fn(id => images.delete(id)), setFilter: vi.fn(),
        setLayoutProperty: vi.fn(), setPaintProperty: vi.fn(),
        getCanvas: vi.fn(() => canvas), getStyle: vi.fn(() => ({ layers: [...layers].map(id => ({ id })) })),
        getBounds: vi.fn(() => ({ getWest: () => -123, getSouth: () => 45, getEast: () => -122, getNorth: () => 46 })),
        on: vi.fn(), off: vi.fn(),
      };
      MapMock.mockImplementation(function () { return map; });
      PopupMock.mockImplementation(function () { return {
        remove: vi.fn(), setLngLat: vi.fn().mockReturnThis(),
        setDOMContent: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis(),
      }; });
      return { sources, layers, images };
    },
  };
});

const park: InterestPlace = {
  id: "park-1", name: "Example Park", category: "park", coordinates: [-122.67, 45.52],
  arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/",
};
const metadata = {
  version: 1 as const, retrievedAt: "2026-11-21T17:00:00Z", source: "City of Portland",
  sourceUrl: "https://www.portlandmaps.com/", license: "PDDL-1.0",
  licenseUrl: "https://www.portlandmaps.com/license", coverage: "Reference inventory",
};

describe("package-owned place and reference overlays", () => {
  let map: Mocked<MapboxMap>;
  let resources: { sources: Map<string, { setData: Mock }>; layers: Set<string>; images: Set<string> };
  beforeEach(async () => {
    resources = (await vi.importMock("mapbox-gl")).configureMocks();
    map = vi.mocked(new MapboxMap({ container: document.createElement("div") }));
  });

  it("uses injected icons, updates place selection/data, and removes its listeners and rendering resources", () => {
    const error = vi.fn(), bounds = vi.fn();
    const image = { width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4), colorSpace: "srgb" as const };
    const icons = vi.fn(() => image);
    const props = { map, onSelect: vi.fn(), onCoincident: vi.fn(), onBounds: bounds, onError: error, createIconImage: icons };
    const { rerender, unmount } = render(<PlacesMap {...props} places={[park]} />);
    expect(icons).toHaveBeenCalledWith("park");
    expect(error).toHaveBeenLastCalledWith(false);
    expect(bounds).toHaveBeenCalledWith([-123, 45, -122, 46]);
    expect(map.addSource).toHaveBeenCalledWith("nearby-places-park", expect.objectContaining({
      cluster: true, attribution: "City of Portland, Bureau of Parks and Recreation",
    }));
    const source = resources.sources.get("nearby-places-park");
    rerender(<PlacesMap {...props} places={[]} selectedId={park.id} />);
    expect(source.setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
    expect(map.setFilter).toHaveBeenCalledWith("nearby-places-park-selection", ["==", ["get", "id"], park.id]);
    expect(map.setLayoutProperty).toHaveBeenCalledWith("nearby-places-park-icons", "visibility", "none");
    unmount();
    expect(map.off).toHaveBeenCalledWith("click", expect.any(Function));
    expect(resources.sources.size).toBe(0);
    expect(resources.layers.size).toBe(0);
    expect(resources.images.size).toBe(0);
    expect(vi.mocked(Popup).mock.results[0].value.remove).toHaveBeenCalled();
  });

  it("preserves polygon visibility and source attribution across style reloads", () => {
    const snapshot: NeighborhoodSnapshot = { ...metadata, type: "FeatureCollection", features: [] };
    const error = vi.fn();
    const { rerender, unmount } = render(<NeighborhoodsMap map={map} snapshot={snapshot} polygonsShown={false} onError={error} />);
    rerender(<NeighborhoodsMap map={map} snapshot={snapshot} polygonsShown onError={error} />);
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith("nearby-neighborhoods-fill", "visibility", "visible");
    resources.sources.clear();
    resources.layers.clear();
    const install = map.on.mock.calls.find(([event]) => event === "style.load")[1] as () => void;
    act(install);
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "nearby-neighborhoods-fill", layout: { visibility: "visible" },
    }), undefined);
    expect(error).toHaveBeenLastCalledWith(false);
    unmount();
    expect(resources.sources.size).toBe(0);
    expect(resources.layers.size).toBe(0);
  });

  it("updates viewport context without reinstalling layers and reports line rendering failures", () => {
    const snapshot: ContextSnapshot = { type: "FeatureCollection", category: "street-trees", features: [] };
    const error = vi.fn();
    const { rerender, unmount } = render(<ContextOverlayMap map={map} snapshot={snapshot} onError={error} />);
    const updated: ContextSnapshot = { ...snapshot, features: [{
      type: "Feature", id: "tree-1", geometry: { type: "Point", coordinates: park.coordinates },
      properties: { name: "Tree", detail: "Reference inventory" },
    }] };
    const source = resources.sources.get("nearby-context-street-trees");
    rerender(<ContextOverlayMap map={map} snapshot={updated} onError={error} />);
    expect(source.setData).toHaveBeenLastCalledWith(updated);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    unmount();
    expect(map.off).toHaveBeenCalledWith("mousemove", "nearby-context-street-trees-features", expect.any(Function));

    const line: LineOverlaySnapshot = { ...metadata, type: "FeatureCollection", category: "recommended-bike-routes", features: [] };
    map.addLayer.mockImplementationOnce(() => { throw new Error("Rendering unavailable"); });
    const rendered = render(<LineOverlayMap map={map} snapshot={line} onError={error} />);
    expect(error).toHaveBeenLastCalledWith("recommended-bike-routes", true);
    rendered.unmount();
    expect(resources.sources.size).toBe(0);
    expect(resources.layers.size).toBe(0);
  });
});
