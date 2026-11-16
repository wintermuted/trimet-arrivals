# Incremental adaptation of Token search work

## Goal and decisions

Adapt the useful functionality from the older Token search work to the merged
Wintermuted app, one coherent feature PR at a time. Port behavior and domain
logic selectively; do not merge the older branch or reintroduce its Bootstrap UI.
The first two increments have been merged, with additional route, stop, map and
walking improvements. The next increment should address remaining location
controls rather than replace those improvements.

- Cover all seven previously identified feature areas in separate increments.
- Preserve existing stop bookmarks and add route/group bookmarks without data
  loss.
- Search stops across the TriMet service area, not only downtown or near the
  current location.
- Support stop names and IDs as general trip-planner inputs; addresses and
  arbitrary map locations are outside the planner's initial scope.
- Make the search homepage the default landing page when ready, keeping Nearby
  accessible and preserving existing deep links.

## Progress and integration strategy

The following status reflects merged `master` at `362435d` after
[#964](https://github.com/wintermuted/trimet-arrivals/pull/964) and
[#965](https://github.com/wintermuted/trimet-arrivals/pull/965):

| Increment | Status | Current scope |
| --- | --- | --- |
| Selected-departure predictions | Implemented | Selected trips drive downstream stop predictions, with exact-trip matching, bounded requests and unavailable/error states. |
| Richer Nearby route lists | Implemented | Grouped routes and directions, filters, multi-stop information, sorting and route navigation are available. |
| Location and map controls | Partially implemented | Radius and route/stop map interactions exist; dropped-pin and search-this-area flows remain to be investigated and implemented. |
| Bookmarks and groups | Partially implemented | Stop bookmarks and editable sections exist; route/group bookmarks remain. |
| Alerts and time displays | Partially implemented | Alert APIs and existing displays are available; user time-display preferences and remaining scoped behavior need review. |
| Service-wide stop catalog | Pending | The destination picker searches route-backed choices; a verified, deduplicated service-wide catalog remains. |
| General stop-to-stop trip planner | Pending | The existing route-specific destination and trip views are not a transfer-capable general planner. |
| Search homepage | Pending | `/` still opens Nearby; a planner-backed search homepage remains. |

These are code-inspection results, not a fresh runtime or full acceptance
validation. Before each subsequent increment, verify the current behavior and
remaining acceptance criteria rather than assuming either completeness or absence.

Work merged alongside increment 2 goes beyond the original plan:

- Inline route details and deep links show directions and stops; list and map
  interactions support selected-stop markers, tooltips and return context.
- Destination selection supports downstream stops, connecting route information,
  a matching route map, selected-trip times and route-specific navigation.
- Stop departures gained route filtering, grouping and prediction-status
  indicators. Optional walking access includes estimates and route handling.

Preserve these improvements when extending location controls, alerts or the
planner. In particular, walking access and route-specific trip selection are not
replacements for dropped-pin searches or general transfer planning.

- Start each PR from the then-current `master`. Confirm the merged app and
  first-paint theme fix are present and that the worktree is clean before each
  increment; do not reuse the merged migration PR as the feature base.
- Treat commit `548ffbf` on `wintermuted-curly-enigma` as the reviewed feature
  source. The branch now also includes `08a2b90`, a dependency-restoration
  commit with substantial lockfile churn; inspect any newer or uncommitted work
  separately and port it only when the feature actually needs it.
- The merged app has shared selected-departure state and downstream predictions,
  an ordered From selector, route and destination selection, route geometry and
  endpoint fitting, trip-ID-based paired times, theme-aware maps, walking access,
  collapsible panels, and working stop bookmark sections. Extend these instead
  of importing older replacements.
- Use `@wintermuted/ui-theme` controls and tokens, existing navigation and
  data-fetching patterns, transit identity colors, and the current responsive
  shell. No wholesale map rewrite, Bootstrap restoration, separate theme
  system, dependency churn, or unrelated cleanup.
- Review each PR's actual diff, tests, and CI before proceeding to dependent
  work. The order below is recommended; independent increments need not block
  each other. Do not assume PR merges or deployment on the user's behalf.

## Increments

### 1. Selected-departure stop predictions — implemented

Merged in [#964](https://github.com/wintermuted/trimet-arrivals/pull/964),
then extended alongside route and stop interactions in
[#965](https://github.com/wintermuted/trimet-arrivals/pull/965). The original
acceptance criteria remain useful regression expectations for future changes.

- Keep shared selection stable by arrival ID and retain its fallback if the
  selected departure disappears on refresh.
- Preserve bounded downstream-arrival requests and the API's documented
  128-location and 60-minute `minutes` limits. Missing records are **not
  reported**, not evidence of no service.
- Match the exact `tripID`, route, direction and stop; never match solely by
  vehicle/block or infer a time. Preserve estimated versus scheduled labels,
  ordered stops and conservative handling of repeated stop IDs.
- Preserve route-origin changes, destination selection, URL navigation,
  existing departure controls and map lifecycle. Handle empty, delayed,
  partial, stale and failed responses, retries, selection changes and cleanup.
- Acceptance: selecting a departure updates only its actual reported
  downstream times; missing trip IDs and unmatched or unavailable predictions
  remain explicitly unavailable. Verify changes of route, direction and origin,
  data refresh, API limits, errors and keyboard operation with focused tests.

### 2. Richer Nearby route lists — implemented

Merged in [#965](https://github.com/wintermuted/trimet-arrivals/pull/965).
That PR also added inline route details, route/stop map interactions, destination
selection refinements, stop-departure controls and optional walking access.
Retain the following acceptance criteria when building on those flows.

- Preserve grouped route/direction filtering, multi-stop and distance
  information in the existing shared controls. Represent both directions and
  retain route detail links and the From selector.
- Preserve filtering, loading, empty and error states. Address bookmark ordering
  in the bookmark increment rather than inventing a dependency here.
- Acceptance: filtering by route and direction, grouped stop selection,
  sorting and navigation work for missing arrivals, multiple directions and
  mobile/keyboard use without regressing existing Nearby behavior.

### 3. Location and map controls — next, partially implemented

- Audit the current radius, location, map and walking flows against the original
  feature behavior and acceptance criteria. Preserve existing route details,
  destination selection, stop markers, walking access and deep links.
- Adapt the remaining useful dropped-pin and search-this-area behaviors, and
  address any verified gaps in find-near-me, radius and out-of-service-area
  handling. Reuse existing geolocation, `directionsSelection.ts`, marker and
  map lifecycle mechanisms; do not duplicate controls already present.
- Keep permission-denied and unavailable-location states actionable; changing
  the search location must update the list, radius and map consistently.
  Avoid exposing precise user location in screenshots or new persistent state.
- Preserve the current Mapbox Standard light preset update in `themedMap.ts`;
  do not bring back the old `setStyle` theme switch that can discard layers.
- Acceptance: pin placement, map movement/radius and returning to current
  location work across theme changes, navigation, permission failures and
  unmount/remount without lost route lines or leaked markers/listeners.

### 4. Bookmarks and groups — partially implemented

Stop bookmarks and editable stop sections already exist. Preserve their current
data and controls while adding the missing route/group capabilities.

- Preserve the current `BOOKMARKS` stop-record schema and existing sections.
  Add versioned, separate route/group storage or a validated compatibility
  layer; never reuse `BOOKMARKS` for the older incompatible route shape.
- Adapt route bookmarking, groups and the older bookmark views to Wintermuted
  controls. Preserve existing saved stops and sections; support adding,
  removing, organizing and navigating route/stop entries without silent loss.
  Include default commute/location shortcuts only where their underlying data
  and navigation are supported.
- Acceptance: old stored stop data remains readable and editable across
  upgrades; new route/group entries survive reload and do not overwrite stop
  records. Exercise empty, duplicate, malformed and unavailable-storage cases,
  plus existing bookmark section controls.

### 5. Alerts and time displays — partially implemented

System, route and stop alert APIs and some existing alert displays are present;
stop-departure status indicators were also improved in #965. Inspect their
current scope and gaps before adding behavior or time-display preferences.

- Adapt meaningful older system/route/stop alerts, countdowns and time-display
  preferences by extending existing alerts APIs, components and time
  formatting. Keep current defaults until the user chooses a preference; keep
  time zones and estimated/scheduled labels explicit.
- Reuse shared alert/disclosure components and existing API refresh/error
  handling. Do not import the older Redux theme system or duplicate alerts.
- Acceptance: displayed alerts are correctly scoped and accessible, time
  preferences persist without changing unrelated storage, and daylight-saving,
  date-boundary, stale-data and empty/error cases are covered.

### 6. Service-wide stop catalog — pending

The existing destination picker searches route-backed choices. Its presence does
not establish a complete, deduplicated service-wide catalog or its freshness.

- Build a searchable, deduplicated stop catalog from a supported authoritative
  TriMet source. Investigate using the existing `getAllRoutes()` routeConfig
  call, which requests stops for all route directions, and verify actual
  completeness, service-area coverage, payload size and freshness; use an
  authoritative GTFS dataset or another documented API only if needed.
- Do not use the older `useTrimetStops` 5,000-foot downtown query as a
  service-wide catalog. Index stop names and IDs, retain distinct platforms,
  bound memory/network usage, and provide useful loading, empty and failure
  states without requiring geolocation.
- Acceptance: representative central and outlying service-area stops can be
  found by name and ID, duplicate route references do not duplicate results,
  and failure or incomplete data is surfaced rather than silently presented
  as complete. Document the selected source's actual coverage limitations.

### 7. General stop-to-stop trip planner — pending

Route-specific destination selection, paired trip times and optional walking
access now exist. Keep those experiences intact and avoid treating them as a
general multi-route or transfer planner.

- Adapt the older TriMet trip-planner client and itinerary rendering, using
  the service-wide catalog for boarding and destination stops. Keep the
  existing same-route Nearby directions flow intact and add an explicit
  route-less planner flow rather than sending incomplete parameters to it.
- Verify the currently supported TriMet API response/format and actual browser
  access before choosing an XML parser or adding a dependency. Normalize
  single/multiple itineraries and walking/transit legs; retain route, stop,
  timing and transfer details. Stop IDs and stop names are the initial input
  boundary; do not add address/geocoder functionality.
- Acceptance: different-route and transfer journeys, deep links, invalid or
  identical stops, no itinerary, partial data, retries and mobile/keyboard
  flows work. Existing route-specific directions, selected-trip times and map
  behavior continue to work.

### 8. Search homepage — pending

The current root redirects to `/nearby`; the older home view remains at
`/homepage-backup`. Neither is the planned planner-backed search homepage.

- Adapt the older homepage's stop search, recent journeys, bookmark preview,
  alerts, nearby links and location/map presentation using the shared catalog,
  general planner, bookmark data and map/location mechanisms. Use the existing
  Wintermuted shell and components rather than the older Bootstrap or rotating
  image implementation.
- Route `/` to the new search homepage only in this increment; keep `/nearby`
  and all existing bookmarked/deep-linked URLs working. Search remains usable
  without location permission and must reach the actual general planner.
- Acceptance: users can search the service area by name/ID and complete a
  stop-to-stop journey; Nearby, bookmarks and alerts remain reachable.
  Exercise no-location, no-results, loading, failure, empty recent/bookmark,
  mobile, keyboard and both-theme states.

## Validation and PR handoff

- For each increment add a small set of focused regression tests for new
  behavior and edge cases, including exact data identity and user-data
  preservation where applicable. Run targeted tests; do not run local lint,
  typecheck or builds. CI owns those checks.
- Verify affected flows on desktop and mobile in both themes and with keyboard
  access, using a separate background browser window. Include before/after
  screenshots and relevant bug context in UI feature PRs; crop or mask map
  location information and explain any masking.
- Keep test fixtures deterministic; distinguish fixture checks from live API
  verification. Check failure, empty, loading, stale and permission states.
  Confirm API query limits, rate/size constraints and actual catalog coverage
  rather than treating a proxy as proof.
- Update directly related documentation and the daily work log. Keep each PR
  reviewable, independently releasable where dependencies allow, and based on
  the latest merged base. Do not copy secrets, old local dependency links, or
  the old branch's unrelated lockfile changes.

## References and notes

- Source work: `wintermuted-curly-enigma` at `548ffbf`; the later dependency
  commit `08a2b90` is not a blanket dependency requirement.
- Existing core files include `src/view/nearby/components/NearbySimpleRouteArrivals.tsx`,
  `src/view/nearby/components/common/DeparturesCard.tsx`,
  `src/view/nearby/components/common/StopsOnRoute.tsx`,
  `src/view/nearby/util/tripTimes.ts`, `src/api/trimet/routeConfig.ts`, and
  `src/api/localstorage/bookmarks.localstorage.ts`.
- TriMet documents [Arrivals V2](https://developer.trimet.org/ws_docs/arrivals2_ws.shtml),
  [RouteConfig](https://developer.trimet.org/ws_docs/routeConfig_ws.shtml), and
  the [Trip Planner](https://developer.trimet.org/ws_docs/tripplanner_ws.shtml).
  Confirm real endpoint behavior and limits during implementation.
