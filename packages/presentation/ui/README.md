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
The [Storybook catalog](../storybook/README.md) imports these public APIs and
documents their states and interactions. Run `npm run storybook` from the root;
maintain examples in `packages/presentation/storybook/stories` alongside changes
to the shared component contracts.

The root entry also exports `DetailHeader`, `WalkingDistance`, and
`BookmarkToggle`, together with their prop types. These components include their
product styles and use the host's Wintermuted theme tokens.

- `DetailHeader` takes a title, optional subtitle/action, and optional truncation.
  Supply `onBack` for a native button or `renderBack` for a navigation element.
  The renderer receives the back icon, class, and accessible label; spread those
  props onto the host's link. With neither callback, no back control is rendered.
  App adapters retain default destinations and modified-click behavior.
- `WalkingDistance` takes a provider-neutral `WalkingDistanceEstimate`, loading
  and enabled flags, a formatted straight-line fallback, and
  `formatDistance(meters)`. It retains ready data while refreshing and shows
  unavailable/unreachable copy otherwise. Fetching, map features, and unit
  policy stay outside the package.
- `BookmarkToggle` takes controlled `isBookmarked`, bookmark/remove labels, and
  an `onClick` handler. Icon-only, labeled, text-only, and disabled states share
  accessible pressed-state presentation. Entity IDs, persistence, and error
  messaging stay with the host; hiding the icon should normally show the label.

```tsx
import { BookmarkToggle, DetailHeader, WalkingDistance } from "@overworld/ui";

<DetailHeader title="Example stop" renderBack={props => <a {...props} href="/stops" />} />;
<WalkingDistance enabled estimate={{ status: "ready", meters: 250, seconds: 180 }}
  straightLine="200 m" formatDistance={meters => `${Math.round(meters)} m`} />;
<BookmarkToggle isBookmarked={saved} bookmarkLabel="Bookmark this stop"
  removeLabel="Remove stop bookmark" onClick={toggleBookmark} showLabel />;
```
Indicator components include their own styles; on-time and early states use the
theme success color without requiring arrivals-table styles.

The root entry exports four place-presentation components and their prop/model
types. Each includes its layout styles, without importing the place catalog,
map APIs, storage, or an application router:

- `PlaceResultRow` renders a list item in `nearby`, `search`, or `saved` layout.
  Hosts provide `renderLink`, icons, name/secondary content, optional trailing
  content, and a separate action. Spread the renderer's props onto the link so
  layout and children are retained. Put rows directly inside a host-owned
  `ul` or `ol`, with layout wrappers outside the list; sorting,
  highlighting, distances, navigation hooks, and save/remove behavior stay outside.
- `GroupedPlaceCategoryFilters` takes groups with category IDs, controlled
  selection, controlled expanded-group IDs, and optional status/icon slots.
  `onSelectionChange` returns a patch of changed category values only; merge it
  with host filters without losing search or unrelated selections. Bulk selection
  derives mixed state from children. Empty groups are disabled and disclosure
  targets are unique across instances.
- `MapReferenceLayerControls` takes controlled layer definitions, callbacks,
  line/point swatches, and optional icon/help/status/child slots. Help and retry
  controls sit outside checkbox labels. Dependent controls are shown only when
  the layer is selected. Hosts own colors, source warnings, map operations, and
  help behavior, including any map-aware positioning.
- `SourceProvenancePanel` renders normalized source/license records with
  host-formatted retrieval/update dates and coverage content. Supply description
  and notice slots for regional caveats; `noticeAfter` places the notice after
  that many records, clamped to the available range. Source data, URLs, locale
  policy, and record ordering remain host-owned.

```tsx
import { PlaceResultRow, GroupedPlaceCategoryFilters } from "@overworld/ui";

<ul>
  <PlaceResultRow name="Example Park" secondary="Park"
    renderLink={props => <a {...props} href="/places/example" />} />
</ul>;
<GroupedPlaceCategoryFilters groups={groups} selected={selected}
  onSelectionChange={changes => setSelected(previous => ({ ...previous, ...changes }))}
  expandedGroups={expandedGroups} onExpandedGroupsChange={setExpandedGroups} />;
```

`ui/transit` also exports `ArrivalRow`, `ArrivalRows`, `ArrivalsTable`, and
`ArrivalsTableLoadMore`, including their prop types and styles. Callers supply
`renderRouteIndicator(routeId, route?)` and `formatDistance(feet)`. The package
owns estimated-time sorting, the initial five-row limit, expand/collapse
controls, and time-display preferences. Links and distance-formatting policy
(including existing legacy behavior) remain in the app adapters.

The root entry also exports `GlobalPlaceSearch`, `SavedPlacesList`,
`PlaceDetailsPanel`, and `DeparturePicker`, with their public prop/model types
and colocated product styles:

- `GlobalPlaceSearch` is controlled through `query`, `onQueryChange`, `open`,
  and `onOpenChange`. It owns field associations, outside-pointer/blur dismissal,
  Arrow key traversal of links in `.transit-global-search-results`, and Escape
  focus restoration. Supply scope/hint/status content, a load-status slot,
  result-list children, and an optional pagination action. The host owns catalog
  activation, matching/highlighting, counts, geography, and closing on navigation.
  Its popover has standalone gutter defaults; app header ordering stays outside.
- `SavedPlacesList` takes ordered `SavedPlaceItem` records, link renderers,
  `onRemove(id)`, and optional status/empty content. It never sorts, fetches, or
  writes storage. Keep previously loaded records and error/retry policy in the
  host. Removal remains a sibling of the navigation link.
- `PlaceDetailsPanel` takes a name/category, optional address, heading ID/ref,
  status/bookmark slots, category-specific children, an arrival notice, and a
  trip action. Optional source/website URLs and a host-formatted source date
  render safe external links. The host owns regional caveats, save state,
  planner URLs, and focus restoration; omitted heading IDs are instance-unique.
- `DeparturePicker` takes records with a string ID and epoch-millisecond
  `estimated`/`scheduled` times, controlled `selectedId`, and `onSelect(record)`.
  The generic callback preserves additional host fields. Selection survives
  replacement records with the same ID; shared time preferences and badges
  retain estimate/schedule presentation. Supply refresh/error status and
  `disabled` as needed. The default empty message can be replaced, including
  with `null` for hosts that already render their own empty-state messaging.
  Fetching, route filtering, and selected-trip integration remain outside.

The root entry exports the remaining stop/trip selection surfaces:

- `StopPredictionList` takes ordered `StopPredictionItem` occurrences with
  instance-unique IDs (including sequence for repeated stops), stop names/IDs,
  validated epoch-millisecond predictions, explicit missing-time labels, stale
  flags, and optional route slots. It formats estimated/scheduled and next-day
  times through shared time preferences. Supply update notes, refresh callbacks,
  loading/error content, notices, and optional empty content. Hosts retain
  polling/batching, selected-trip matching, repeated-stop ambiguity, stale-data
  policy, route metadata fetching, and retry behavior.
- `TripOptionPicker` is also exported from `@overworld/ui/journeys`. Supply
  itineraries, `selectedIndex` (`-1` for no selection), controlled `editing`,
  selection/edit/cancel callbacks, optional focus refs, and optional hover/focus
  preview callbacks. It reuses `TripOptionSummary` and `PlannerDisclosure` for
  comparison, confirmed summaries, current-trip labels, and collapse actions.
  Touch does not trigger hover previews. The host handles preview cleanup on
  selection/cancel/collapse, map and URL integration, and itinerary fetching.

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
