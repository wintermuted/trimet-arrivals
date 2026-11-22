# @overworld/maps

Mapbox map lifecycle, theme synchronization, current-location layers, and
nearby radius-to-zoom mapping.

`createThemedMap(options, theme)` creates a Standard basemap and synchronizes its
day/night preset without recreating the map. The injected `MapTheme` provides
the current preset and a subscription with cleanup. Removal releases theme and
style listeners. The package does not assume a DOM theme attribute.

Current-location helpers retain the existing layer/source IDs, search-radius
circle in feet, and load-event initialization.

The `@overworld/maps/transit` entry owns stop markers, route and directions
overlays, vehicle symbols/camera following, and vehicle tooltips. Route geometry
loaders, route names, route-detail requests, and tooltip factories are injected.
Nearby inputs are structural stop/route records, not Redux state.
Request failures retain usable routes and report errors; rendering failures
clean up resources and propagate instead of returning an empty success.
Route layer IDs use the requested route and direction, not optional provider properties.

The app owns access-token setup, theme observation, initial camera options,
configured requests, route display names, navigation, and screen orchestration.

The optional React `@overworld/maps/places` entry exports `PlacesMap`,
`NeighborhoodsMap`, `ContextOverlayMap`, and `LineOverlayMap`, plus place icon
helpers. They consume published `places` snapshots and preserve attribution,
layer ordering, clustering, hover previews, and style-reload/unmount cleanup.
`PlacesMap` accepts an optional `createIconImage` provider. Selection,
coincident-place choices, viewport bounds, and rendering errors are callbacks;
snapshot loading, filters, and navigation remain app-owned. The main maps
entry does not load React.

The optional React `@overworld/maps/planner` entry exports `PlannerPaths`.
It owns itinerary stop markers/popups, selected/alternative path layers,
hover highlighting, camera fitting, and suspension/resume cleanup. Inject a
stable `loadPaths(itineraries, signal, walkingEnabled)` callback returning
`{ data }`; the app supplies configured path providers and route colors.
The required `renderStatus` callback receives rendering/request errors,
selected paths, and incomplete-coverage status. Place-discovery controls and
screen navigation remain app-owned. Superseded loads are canceled and ignored.

From the repository root: `npx nx run @overworld/maps:test:package`.
