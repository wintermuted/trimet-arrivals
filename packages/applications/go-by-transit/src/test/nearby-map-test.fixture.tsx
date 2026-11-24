import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { getArrivals } from "../api/trimet/arrivals";
import { getRouteById } from "../api/trimet/routeConfig";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider, useFeatureFlags } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent, { NearbySimpleRoutesComp, NearbyStopDetailComponent, NearbyTripPlannerComponent } from "../view/nearby/components/NearbyViewComponent";
import { showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";
import { BookmarksProvider } from "../state/bookmarks/BookmarksProvider";
import NearbyVehicles from "../view/nearby/components/NearbyVehicles";
import * as placesApi from "@overworld/places/catalog";
import { SAVED_PLACES_KEY } from "@overworld/places/savedPlaces";
import GlobalPlacesSearch from "../view/mainNav/components/GlobalPlacesSearch";
import NearbyPlacesMap from "../view/nearby/components/NearbyPlacesMap";

export function StopDetailWithBookmarks() {
  return <BookmarksProvider><NearbyStopDetailComponent /></BookmarksProvider>;
}

export const stops: StopData = {
  location: [
    {
      desc: "Example stop",
      dir: "E",
      lat: 0,
      lng: 0.001,
      locid: 101,
      route: [
        {
          desc: "Example route",
          dir: [{ desc: "To Example Destination", dir: 0 }],
          route: 56,
          type: "bus",
        },
      ],
    },
  ],
  queryTime: "",
};

function WalkingToggle() {
  const { walkingEnabled, setWalkingEnabled } = useFeatureFlags();
  return <button onClick={() => setWalkingEnabled(!walkingEnabled)}>Toggle walking estimates</button>;
}

export function mockVehicleFollow() {
  vi.mocked(NearbyVehicles).mockImplementation(({ onFollow }) => <button onClick={() => onFollow({
    id: "4003", type: "bus", tripId: "trip", blockId: "1547", routeNumber: 15,
    longitude: -122.68, latitude: 45.51, time: Date.now(), expires: Date.now() + 60000,
  })}>Follow test trip</button>);
}

export function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="current-url">{location.pathname}{location.search}</output>
    <button aria-label="Browser back" onClick={() => navigate(-1)}>Browser back</button>
    <button aria-label="Browser forward" onClick={() => navigate(1)}>Browser forward</button>
  </>;
}

export function setupNearbyMapTest() {
  let container: HTMLDivElement;
  let root: Root;
  const sources = new Set<string>();
  const layers = new Set<string>();
  const images = new Set<string>();
  const canvas = document.createElement("canvas");
  const map = {
    on: vi.fn(), remove: vi.fn(), resize: vi.fn(), flyTo: vi.fn(),
    getZoom: vi.fn(() => 12), jumpTo: vi.fn(), easeTo: vi.fn(),
    getCenter: vi.fn(() => ({ lng: 1, lat: 2 })), setZoom: vi.fn(),
    getContainer: vi.fn(() => ({ clientWidth: 390, clientHeight: 230 })),
    fitBounds: vi.fn(), setFilter: vi.fn(), off: vi.fn(),
    queryRenderedFeatures: vi.fn(),
    addSource: vi.fn((id, _data) => sources.add(id)),
    addLayer: vi.fn(({ id }) => layers.add(id)),
    getSource: vi.fn(id => sources.has(id) ? { setData: vi.fn() } : undefined),
    getStyle: vi.fn(() => ({ layers: [...layers].map(id => ({ id })) })),
    getLayer: vi.fn(id => layers.has(id)),
    removeLayer: vi.fn(id => layers.delete(id)),
    removeSource: vi.fn(id => sources.delete(id)),
    getBounds: () => ({ getWest: () => -122.8, getEast: () => -122.5, getSouth: () => 45.4, getNorth: () => 45.7 }),
    getCanvas: () => canvas,
    hasImage: vi.fn(id => images.has(id)),
    addImage: vi.fn(id => images.add(id)),
    removeImage: vi.fn(id => images.delete(id)),
    setLayoutProperty: vi.fn(),
  };
  const marker = {
    setLngLat: vi.fn(), addTo: vi.fn(), getLngLat: vi.fn(() => ({ lng: 3, lat: 4 })),
    on: vi.fn(), off: vi.fn(), remove: vi.fn(), setPopup: vi.fn(), togglePopup: vi.fn()
  };
  const previousResizeObserver = global.ResizeObserver;
  const originalFetch = global.fetch;
  const routeGeometry = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => routeGeometry });
    vi.mocked(NearbyVehicles).mockReturnValue(null);
    sources.clear();
    layers.clear();
    images.clear();
    vi.mocked(NearbyPlacesMap).mockImplementation(function PlaceMap({ map, onBounds }) {
      React.useEffect(() => {
        if (map) onBounds([-122.8, 45.4, -122.5, 45.7]);
      }, [map, onBounds]);
      return null;
    });
    map.getContainer.mockReturnValue({ clientWidth: 390, clientHeight: 230 });
    map.addSource.mockImplementation(id => sources.add(id));
    map.addLayer.mockImplementation(({ id }) => layers.add(id));
    map.getSource.mockImplementation(id => sources.has(id) ? { setData: vi.fn() } : undefined);
    map.getLayer.mockImplementation(id => layers.has(id));
    map.removeLayer.mockImplementation(id => layers.delete(id));
    map.removeSource.mockImplementation(id => sources.delete(id));
    map.getCenter.mockReturnValue({ lng: 1, lat: 2 });
    map.getZoom.mockReturnValue(12);
    map.getStyle.mockImplementation(() => ({ layers: [...layers].map(id => ({ id })) }));
    marker.getLngLat.mockReturnValue({ lng: 3, lat: 4 });
    marker.setLngLat.mockReturnValue(marker);
    marker.setPopup.mockReturnValue(marker);
    marker.addTo.mockReturnValue(marker);
    (await vi.importMock("mapbox-gl")).default.Marker.mockImplementation(function () { return marker; });
    global.ResizeObserver = vi.fn().mockImplementation(function () { return {
      disconnect: vi.fn(),
      observe: vi.fn(),
    }; });
    vi.mocked(getCurrentPosition).mockResolvedValue({
      coords: {
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 0,
        longitude: 0,
        speed: null,
      },
      timestamp: 0,
    });
    vi.mocked(getNearbyStops).mockResolvedValue(stops);
    vi.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], location: [], queryTime: ""
    });
    vi.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 56, id: 56, desc: "Example route", type: "bus",
        routeColor: "", routeSortOrder: 56,
        dir: [{ dir: 0, desc: "To Example Destination", stop: [
          { ...stops.location[0], seq: 1, tp: false }
        ] }]
      }]
    });
    vi.mocked(showRouteInfo).mockReturnValue(vi.fn());
    (await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util"))
      .showStopDetailMarker.mockImplementation(() => vi.fn());
    (await vi.importMock("../view/nearby/util/mapbox/initializeMap"))
      .initializeMap.mockReturnValue(map);
    (await vi.importMock("../view/nearby/util/mapbox/currentLocation"))
      .initializeCurrentLocationMarker.mockReturnValue(map);
    (await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util"))
      .setNearbyStops.mockReturnValue(map);
    (await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util"))
      .removeStopLocationLayers.mockReturnValue(map);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.ResizeObserver = previousResizeObserver;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    localStorage.removeItem(SAVED_PLACES_KEY);
  });

  function render(path: string, withExplore = false, withGlobalSearch = false) {
    return act(async () =>
      root.render(
        <FeatureFlagsProvider>
          <WalkingToggle />
          <MemoryRouter initialEntries={[path]}>
            <NavigationProbe />
            {withGlobalSearch && <GlobalPlacesSearch />}
            <Routes>
              <Route path="/nearby" element={<NearbyViewComponent />}>
                <Route path="places" element={null} />
                <Route path="places/:placeId" element={null} />
                <Route path="planner" element={
                  <BookmarksProvider>
                    <NearbyTripPlannerComponent /></BookmarksProvider>
                } />
                <Route path="stops/:id" element={<StopDetailWithBookmarks />} />
                {withExplore && <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />}
                <Route path="*" element={<p>Sidebar ready</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </FeatureFlagsProvider>
      )
    );
  }

  function finishMapLoading() {
    const listeners = map.on.mock.calls.filter(([event]) => event === "load");
    act(() => listeners[listeners.length - 1][1]());
  }

  function button(label: string) {
    return Array.from(container.querySelectorAll("button")).find(item =>
      item.textContent.includes(label) ||
      item.getAttribute("aria-label")?.includes(label) ||
      item.title.includes(label)
    );
  }

  function discoveryCatalog(places: placesApi.InterestPlace[]) {
    const snapshot: placesApi.PlaceSnapshot = {
      version: 1, category: "park", retrievedAt: "2026-11-19T12:00:00Z",
      source: "City of Portland", sourceUrl: "https://www.portlandmaps.com/", license: "PDDL-1.0",
      licenseUrl: "https://opendatacommons.org/licenses/pddl/1-0/", coverage: "Test", places
    };
    vi.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({ places,
      sources: { ...placesApi.emptyPlaceSources(), park: { snapshot, loading: false, error: false } }, retry: vi.fn() });
  }
  const discoveryPark: placesApi.InterestPlace = { id: "portland:park:1", category: "park", name: "Example Park",
    coordinates: [-122.67, 45.55], sourceUrl: "https://www.portlandmaps.com/", arrival: "approximate" };

  return {
    get container() { return container; },
    get root() { return root; },
    map, marker, sources, layers, images, routeGeometry,
    render, finishMapLoading, button, discoveryCatalog, discoveryPark
  };
}
