import { act, render } from "@testing-library/react";
import { Map as MapboxMap, Popup } from "mapbox-gl";
import type { InterestPlace } from "@trimet-arrivals/places/catalog";
import type { NeighborhoodSnapshot } from "@trimet-arrivals/places/neighborhoods";
import type { LineOverlaySnapshot } from "@trimet-arrivals/places/lineOverlays";
import type { ContextSnapshot } from "@trimet-arrivals/places/contextOverlays";
import { PlacesMap, NeighborhoodsMap, LineOverlayMap, ContextOverlayMap } from "../places";

jest.mock("mapbox-gl", () => {
  const MapMock = jest.fn(), PopupMock = jest.fn();
  return {
    Map: MapMock, Popup: PopupMock,
    configureMocks() {
      const sources = new Map<string, { setData: jest.Mock }>();
      const layers = new Set<string>(), images = new Set<string>();
      const canvas = globalThis.document.createElement("div");
      const map = {
        addSource: jest.fn(id => { sources.set(id, { setData: jest.fn() }); return map; }),
        addLayer: jest.fn(({ id }) => { layers.add(id); return map; }),
        getSource: jest.fn(id => sources.get(id)), getLayer: jest.fn(id => layers.has(id)),
        removeLayer: jest.fn(id => { layers.delete(id); return map; }),
        removeSource: jest.fn(id => { sources.delete(id); return map; }),
        hasImage: jest.fn(id => images.has(id)), addImage: jest.fn(id => images.add(id)),
        removeImage: jest.fn(id => images.delete(id)), setFilter: jest.fn(),
        setLayoutProperty: jest.fn(), setPaintProperty: jest.fn(),
        getCanvas: jest.fn(() => canvas), getStyle: jest.fn(() => ({ layers: [...layers].map(id => ({ id })) })),
        getBounds: jest.fn(() => ({ getWest: () => -123, getSouth: () => 45, getEast: () => -122, getNorth: () => 46 })),
        on: jest.fn(), off: jest.fn(),
      };
      MapMock.mockImplementation(() => map);
      PopupMock.mockImplementation(() => ({
        remove: jest.fn(), setLngLat: jest.fn().mockReturnThis(),
        setDOMContent: jest.fn().mockReturnThis(), addTo: jest.fn().mockReturnThis(),
      }));
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
  let map: jest.Mocked<MapboxMap>;
  let resources: { sources: Map<string, { setData: jest.Mock }>; layers: Set<string>; images: Set<string> };
  beforeEach(() => {
    resources = jest.requireMock("mapbox-gl").configureMocks();
    map = jest.mocked(new MapboxMap({ container: document.createElement("div") }));
  });

  it("uses injected icons, updates place selection/data, and removes its listeners and rendering resources", () => {
    const error = jest.fn(), bounds = jest.fn();
    const image = { width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4), colorSpace: "srgb" as const };
    const icons = jest.fn(() => image);
    const props = { map, onSelect: jest.fn(), onCoincident: jest.fn(), onBounds: bounds, onError: error, createIconImage: icons };
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
    expect(jest.mocked(Popup).mock.results[0].value.remove).toHaveBeenCalled();
  });

  it("preserves polygon visibility and source attribution across style reloads", () => {
    const snapshot: NeighborhoodSnapshot = { ...metadata, type: "FeatureCollection", features: [] };
    const error = jest.fn();
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
    const error = jest.fn();
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
