# @trimet-arrivals/trimet-client

TriMet API clients, stop catalog indexing and search, and vehicle freshness rules.
The clients handle arrivals, stops, alerts, route configuration, trip planning,
and vehicle data. The package also matches same-route arrivals across stops and
groups nearby stop and route data. The app supplies the API URL and ID and owns
configured catalog requests, caching, and planner colors.

The optional `@trimet-arrivals/trimet-client/react` entry exports
`useVehiclePositions(viewport, enabled, requestVehicles, vehicleId?)` and
`useVehicleTrip(blockId, tripId, updatedAt, enabled, requestTrip)`.
The hooks own request cancellation, freshness, backoff, tab visibility, and
retry state. Position polling uses the injected viewport's bounds and
movement/removal subscriptions; it does not depend on Mapbox.
The app supplies configured request functions and the viewport adapter.
Keep request functions and viewport objects stable across renders.
Importing the main entry does not load React.

The main entry also exports `vehicleTripLegs(trip, mode)` and
`VehicleTripProgressMode` (`live`, `last-known`, or `scheduled`). The pure helper
derives adjacent public-stop legs, canceled/passed states, and the current-leg
label without fetching data or importing React. Timeline rendering lives in
`ui/vehicles`; feed selection, request configuration, and navigation stay in
the app.

`useStopCatalog(request)` owns catalog loading, refresh, last-known data, error
state, and receipt time. The injected request receives `false` on initial load
and `true` on refresh; it must stay stable across renders. The hook preserves
extra catalog metadata supplied by the app, ignores superseded/unmounted
results, and retains previous data when a refresh fails. Callers render the
returned `loading` and `error` states and invoke `refresh()` for recovery.

From the repository root: `npx nx run @trimet-arrivals/trimet-client:test:package`.
