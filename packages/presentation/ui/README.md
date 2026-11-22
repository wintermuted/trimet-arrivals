# @trimet-arrivals/ui

Shared React time display settings, arrival indicators, and time presentation.
The package exports `TimeDisplayProvider`, `useTimeDisplay`, and
`TimeDisplaySettings`, plus `EarlyIndicator`, `LateIndicator`, `OnTimeIndicator`,
`TimeToArrivalIndicator`, `TimeDiffBadge`, and time-formatting/difference helpers.
The arrival indicators retain their existing Moment-based behavior and package
their styles; the badge uses the shared UI theme. See the [design system guide](../../../docs/design-system.md)
for shared UI conventions.
Indicator components include their own styles; on-time and early states use the
theme success color without requiring arrivals-table styles.

`ui/transit` also exports `ArrivalRow`, `ArrivalRows`, `ArrivalsTable`, and
`ArrivalsTableLoadMore`, including their prop types and styles. Callers supply
`renderRouteIndicator(routeId, route?)` and `formatDistance(feet)`. The package
owns estimated-time sorting, the initial five-row limit, expand/collapse
controls, and time-display preferences. Links and distance-formatting policy
(including existing legacy behavior) remain in the app adapters.

The `@trimet-arrivals/ui/transit` entry exports router-free `RouteIndicator`,
`RouteDescription`, `FrequentServiceIndicator`, `StopLocationIndicator`, and
`PlannerStopSelect`.
Route labels are supplied by the app. App wrappers retain route/stop links and
the existing legacy route stylesheet; frequent-service styles live in the package.

`PlannerStopSelect` takes catalog stops, selection/change callbacks, loading
state, optional saved labels, and optional common-place definitions. Common
places appear only when their IDs exist in the supplied catalog. Search,
quadrant grouping, route/mode badges, and picker styles live in the package;
Portland destination presets and bookmark/URL integration stay in the app.

The `@trimet-arrivals/ui/journeys` entry exports `JourneyDirections`,
`ItineraryDetails`, `TripOptionSummary`, `PlannerDisclosure`, endpoint markers,
and stop-pair presentation. The package owns their styles, planned-time copy,
leg ordering, and accessible disclosure/highlight interactions. The app
supplies `transitColor(leg)`, focus refs, selection callbacks, and navigation.
Shared disclosure Sass mixins are available at `@trimet-arrivals/ui/disclosure`.

The `@trimet-arrivals/ui/alerts` entry exports system, route/stop, and scoped-stop
alert cards. Callers supply loading content, feed state/retry callbacks, and
route/stop link or badge renderers. Stop alerts must already be scoped by the
caller. Cards retain the last-received data during refresh failures and use
the shared time-display context; they do not fetch data or import a router.

The `@trimet-arrivals/ui/vehicles` entry exports `VehicleTripProgress` and its
prop/result-state types. Callers supply selection/feed state, the trip snapshot,
retry and map-view callbacks, a header, optional focus ref, and default timezone.
The package owns stop-to-stop timelines, live/last-known/scheduled labels,
staleness and partial/error messaging, and styles. It does not poll, navigate,
or configure the feed; the app retains those policies.

The `@trimet-arrivals/ui/search` entry exports `StopSearch` and `StopSearchProps`.
Callers supply a catalog, loading/error state, retry callback, result-link
renderer, and optional footer and input ID. The package owns query state,
name/alias/ID matching, exact-ID priority, the six-result limit, partial/empty
states, accessible field associations, and responsive search styles.
Catalog fetching/caching and all navigation URLs remain in the app; the
homepage adapter uses the shared catalog hook with its configured provider.

From the repository root: `npx nx run @trimet-arrivals/ui:test:package`.
