# @trimet-arrivals/routing

Mapbox walking estimates, route geometry, and vehicle interpolation.
Walking requests are cached; transit segment selection and vehicle interpolation
do not depend on Mapbox. `getRouteGeometry(routeId, directionId, { baseUrl, signal })`
loads route assets and normalizes line-based geometry collections without
joining disconnected segments. The app supplies the asset base URL and walking
token and owns animation scheduling, cameras, and map layers.

The optional `@trimet-arrivals/routing/react` entry exports
`useWalkingEstimates(origin, stops, enabled, requestEstimates?)`. It handles
opt-in, input validation, cancellation, stale results, request states, and
manual refresh. Requests default to the package's cached walking client; an
app adapter may inject its request function. Keep request functions stable
across renders. Importing the main entry does not load React.

`loadPlannerPaths(itineraries, signal, walkingEnabled, providers)` assembles
walking and transit leg geometry. Providers supply route configuration, route
assets, walking paths, route IDs, and transit colors. The package deduplicates
requests per assembly, traces connected multiline shapes, and retains usable
legs when other geometry is unavailable. It never bridges disconnected shapes
or requests walking routes without opt-in. Failed requests are logged; aborted
requests do not publish warnings.

From the repository root: `npx nx run @trimet-arrivals/routing:test:package`.
