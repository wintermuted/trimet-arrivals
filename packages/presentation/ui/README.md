# @overworld/ui

Generic interactions come from the published `@wintermuted/ui-react` package.
Alert refresh controls consume `RefreshAction`; `PlannerDisclosure` adapts
`ActionDisclosure` while retaining the existing journey API and icons.
Transit types, copy, last-received alert policy, and preview cleanup remain here.
Hosts must load `@wintermuted/ui-theme` styles explicitly; React imports do not
include CSS.

Shared React time display settings, arrival indicators, and time presentation.
The package exports `TimeDisplayProvider`, `useTimeDisplay`, and
`TimeDisplaySettings`, plus `EarlyIndicator`, `LateIndicator`, `OnTimeIndicator`,
`TimeToArrivalIndicator`, `TimeDiffBadge`, and time-formatting/difference helpers.
Time helpers and component props take epoch-millisecond numbers; callers pass
`Date.now()` for the current time. Clock formatting uses native `Intl` and the
shared time-display preferences rather than a date-library wrapper.
Countdowns display `Due` at or past arrival time. Second-resolution indicators
show total minutes and remaining seconds without wrapping at an hour; early/late
indicators show the elapsed difference in the applicable direction.
Minute-resolution badges truncate toward zero and use rounded hours from
60 minutes onward. Missing/invalid times retain placeholders or `Time unavailable`;
countdown helpers fall back to a valid schedule when no valid estimate exists.
The indicators package their styles; the badge uses `@wintermuted/ui-react`.
Hosts supply the `@wintermuted/ui-react@^1.2.0`, React, and `react-select` peers and
load `@wintermuted/ui-theme@^1.0.3`'s `index.css` for shared styles, including
`.wm-action-disclosure*` and `.wm-load-status*`.
See the [design system guide](../../../docs/design-system.md)
for shared UI conventions.
Indicator components include their own styles; on-time and early states use the
theme success color without requiring arrivals-table styles.

`ui/transit` also exports `ArrivalRow`, `ArrivalRows`, `ArrivalsTable`, and
`ArrivalsTableLoadMore`, including their prop types and styles. Callers supply
`renderRouteIndicator(routeId, route?)` and `formatDistance(feet)`. The package
owns estimated-time sorting, the initial five-row limit, expand/collapse
controls, and time-display preferences. Links and distance-formatting policy
(including existing legacy behavior) remain in the app adapters.

The `@overworld/ui/transit` entry exports router-free `RouteIndicator`,
`RouteDescription`, `FrequentServiceIndicator`, `StopLocationIndicator`, and
`PlannerStopSelect`.
Route labels are supplied by the app. App wrappers retain route/stop links and
the existing legacy route stylesheet; frequent-service styles live in the package.

`PlannerStopSelect` takes catalog stops, selection/change callbacks, loading
state, optional saved labels, and optional common-place definitions. Common
places appear only when their IDs exist in the supplied catalog. Search,
quadrant grouping, route/mode badges, and picker styles live in the package;
Portland destination presets and bookmark/URL integration stay in the app.

The `@overworld/ui/journeys` entry exports `JourneyDirections`,
`ItineraryDetails`, `TripOptionSummary`, `PlannerDisclosure`, endpoint markers,
and stop-pair presentation. The package owns their styles, planned-time copy,
leg ordering, and accessible disclosure/highlight interactions. The app
supplies `transitColor(leg)`, focus refs, selection callbacks, and navigation.
Shared disclosure Sass mixins are available at `@overworld/ui/disclosure`.

The `@overworld/ui/alerts` entry exports system, route/stop, and scoped-stop
alert cards. Callers supply loading content, feed state/retry callbacks, and
route/stop link or badge renderers. Stop alerts must already be scoped by the
caller. Cards retain the last-received data during refresh failures and use
the shared time-display context; they do not fetch data or import a router.

The `@overworld/ui/vehicles` entry exports `VehicleTripProgress` and its
prop/result-state types. Callers supply selection/feed state, the trip snapshot,
retry and map-view callbacks, a header, optional focus ref, and default timezone.
The package owns stop-to-stop timelines, live/last-known/scheduled labels,
staleness and partial/error messaging, and styles. It does not poll, navigate,
or configure the feed; the app retains those policies.

The `@overworld/ui/search` entry exports `StopSearch` and `StopSearchProps`.
Callers supply a catalog, loading/error state, retry callback, result-link
renderer, and optional footer and input ID. The package owns query state,
name/alias/ID matching, exact-ID priority, the six-result limit, partial/empty
states, accessible field associations, and responsive search styles.
Catalog fetching/caching and all navigation URLs remain in the app; the
homepage adapter uses the shared catalog hook with its configured provider.

From the repository root: `npx nx run @overworld/ui:test:package`.
