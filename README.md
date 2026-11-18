[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

# Usage

- npm ci
- npm run watch

## Design system

The app uses `@wintermuted/ui-theme` for its CSS, React components, and theme
preferences. `src/index.tsx` imports `@wintermuted/ui-theme/index.css` and calls
`initTheme` from `@wintermuted/ui-theme/theme` before rendering. Both HTML
templates run the library's `getThemeScript()` bootstrap before styles to apply
the saved or system theme on first paint. `ThemeProvider`
wraps the app; the footer's sun/moon button switches between Light and Dark,
with the preference saved under `wintermuted:theme`. Without an explicit saved
choice, the app follows the system theme.

Import shared controls from `@wintermuted/ui-theme/react`. The bookmark section
picker uses `MultiSelect` from `@wintermuted/ui-theme/react/select`, with
`react-select` retained as its peer dependency. Keep router links as children of
shared navigation/list components rather than wrapping controls in link bridges.
Bootstrap styles, components, and router adapters are no longer used.

Responsive page layouts use app-owned `.transit-container`, `.transit-columns`,
and `.transit-grid` rules in `src/App.css`. Use `--wm-*` variables for application
surfaces and status colors. Transit route colors remain in
`src/styles/routes.scss`; map and transit data behavior remain separate from
presentation changes.

The app pins `@wintermuted/ui-theme@0.21.5`, the first published release with
these React/theme/select entries. Both lockfiles resolve this package to the
public npm registry; no local integration tarball is required.

Primary navigation pairs icons with labels and highlights the full active
section, including line detail pages. On narrow screens, the Menu button reveals
the routes. The theme toggle lives in an always-visible footer on every page.
Page content scrolls independently between the header and footer, keeping theme
controls accessible without covering the content.

Nearby fills that available space with independently scrolling results and a
contained map. On narrow screens the results and map share the available height
in stacked panels; map resizing follows panel size changes rather than a fixed
viewport-height offset.
Nearby removes the main content's outer gutters so the map reaches the available
edges; the results sidebar retains 14px horizontal padding only, with no top/bottom
gutter. The sidebar detail header spans the full available sidebar width while its
contents align with the padded content below. Other pages keep the standard content spacing.
The Nearby sidebar switches between **Explore** (nearby routes and stops) and
**Plan a trip** (`/nearby/planner`). The map stays in place. The sidebar planner
uses the service-wide stop catalog and works without a nearby location or
nearby results. Standalone `/planner` links still work; both planner views
support `from` and `to` query parameters.
**Recent trips** in the sidebar reopens up to five successful stop pairs
stored in this browser by either planner view. Choosing a pair fetches fresh
itineraries instead of reusing old departure times.
Nearby draws available trip paths together: the selected option is blue and
alternatives are gray. The map uses published transit shapes matched to the
itinerary's boarding and exit stops. Only boarding and exit stops for the
selected option are marked while planning; Nearby markers return in Explore.
With **Walking estimates** enabled,
Mapbox estimates the walking paths from TriMet's leg endpoints, including
transfers. Dashed lines distinguish these paths from transit. Legs without
usable path data are omitted rather than replaced with straight lines.
Detail headers use an accessible back-caret link before the title rather than an
outlined Back button.
Departure rows support mouse and keyboard selection, with a highlight and caret
identifying the selected departure. Selection persists across updates while that
departure remains available; otherwise the first departure is selected.

The Nearby route list groups stops by route, then direction; route headings use
the number alone (for example, 56 rather than Route 56).
Route and direction headings are independent keyboard-accessible disclosures,
expanded by default; collapsing a route retains its directions' open/closed state.
Direction sections use compact spacing while retaining full-size heading targets.
The right-aligned info icon in each route header opens the general line page
separately from the disclosures and stays available when the route is collapsed.
Each stop row shows
its next reported arrival and distance; click the row's View arrivals action to
open that route, direction, and boarding stop in the sidebar. All nearby stops
are listed rather than hidden in a selector. The right-aligned filter and sort
icons open their controls. Hovering or keyboard-focusing a stop row highlights
its matching map marker and shows the same tooltip as hovering the marker itself.
Leaving or blurring restores any remaining focus/hover
highlight, otherwise the normal marker color. Collapsing, filtering, sorting,
refreshing the stop list, or leaving the view clears stale highlights. Sorting
ranks whole routes by their earliest reported
arrival, nearest stop, or route number without separating their directions.

Nearby discovers candidates within the selected **straight-line radius**, not a
walking catchment. Nearby requests your device location when opened; if it is
unavailable or permission is denied, use the map to search instead or retry
after changing browser permissions. Move the map and choose **Search this area**
to search its center, or **Drop pin at map center** and drag the pin to move
the search. Both use the selected radius. **Find near me** requests a fresh
device location. The selected location stays in memory only. An empty result
can mean the selected location is outside TriMet's service area.

Distances are explicitly labeled straight-line until you
enable **Walking estimates** in **Feature flags**, opened from the footer menu.
Opting in sends the selected search location and exact stop coordinates, or
trip-planner walking leg endpoints, to Mapbox. Feature flags apply immediately across the app in the current tab, stay
in memory only, and reset to off on reload. Turning walking estimates off
aborts requests, removes the walking overlay and clears
the in-memory routing cache. Coordinates are not persisted by this feature.
Enabling walking estimates ranks stops within each direction, and the Nearest
stop sort, by Mapbox's recommended walking-network distance. Arrival remains
the default route sort. Unknown, unreachable or unreliable estimates rank
after known walking distances rather than silently using geographic distance.
The labels retain explicitly marked straight-line distances when walking
estimates are unavailable; failures provide manual retry, with no automatic
retry loop. Selecting a boarding stop shows its walking distance/time and a
dashed green walking path, independently of the bus route.
The general Nearby stop view (`/nearby/stops/:id`) uses the same feature flag,
selected search location, walking estimates and map path. Changing stops or
turning the flag off removes the previous path; stop-data failures offer retry
and never reuse a previous stop's location. Its full-row departure links keep
route/destination labels on the left and relative, estimated and scheduled
times together on the right, with explicit estimated/scheduled labels.

Walking routing uses the existing map's public Mapbox access token. The token
and account must allow the walking Matrix and Directions APIs, with appropriate
URL restrictions and billing enabled. Matrix requests use one origin and at
most 24 distinct stops per batch; single-stop requests use Directions. Requests
are sequential, cancel on changed inputs or leaving the view, and use a bounded
60-second in-memory cache. No Matrix `fallback_speed` is used. Returned null
pairs are unreachable; snapping over 50 meters is conservatively treated as
unreliable, not proof of accessibility. HTTP access/rate-limit errors are shown
without exposing request URLs. Walking estimates depend on GPS, map coverage
and routing preferences; they are neither exact distance guarantees nor
wheelchair-accessibility guidance. There is no continuous GPS tracking: refresh
walking estimates reuses the selected search location; use **Find near me** to
obtain a new device location. Stops outside the radial discovery area are not evaluated.

Nearby stop markers are initialized when the map finishes loading, independently
of the sidebar view. Full refreshes and direct links to Nearby Stops therefore
show the same markers without first visiting Nearby Routes.

The info button on a Nearby route opens its details in the sidebar without
leaving the map. Both directions and their stops are listed and shown on the
map; closing restores the nearby markers and previous map view. The route lines
use the checked-in geometry snapshot, which may lag current stop information.
Route details can be shared or reopened at `/nearby/simple-routes?route=54`
(substitute the desired route number); browser back and forward navigate the
panel, and closing it preserves other query parameters.
The route-stop header also opens this panel without discarding the selected stop
or departure; its route query parameter can likewise be shared or reopened.
Directions can be collapsed independently; hovering or focusing a stop
highlights its marker and opens its map tooltip. Hovering a marker also shows
the tooltip, and selecting a stop in either place opens its stop view.
The stop view's Back link returns to the originating route details, including
its query parameters; direct stop links without a referrer return to Nearby Stops.
Stop details show the selected stop and its identifying map popup even outside
the nearby radius, and list the routes serving that stop.

Nearby Stops card headers put the stop name first and the stop ID on the right;
the full header opens the stop. Hovering a card or focusing any of its links
highlights its marker and opens the same popup as marker hover. Pointer hover
takes precedence over keyboard focus, and leaving restores any focused card.
Changing the stop data or radius, or leaving the view, clears stale highlights.
Each listed route direction has a Go action that starts destination selection
from that stop.
With walking estimates enabled, cards are ordered by estimated walking-network
distance, nearest first, with ties broken by stop ID. Unreachable, unreliable, or missing
estimates are listed last, never ranked using straight-line distance as a
substitute. Cards show walking distance and time, with labeled straight-line
distances when walking is unavailable. Loading, retry and refresh controls use
the same routing service and consent flag as Nearby Routes. Turning the flag off
restores the original stop ordering without making walking requests.

Mapbox maps use the Standard basemap's day/night lighting preset to follow the
app's resolved Light/Dark theme, including saved and system preferences. Changing
themes updates the existing map configuration rather than replacing the style,
preserving route lines, stop markers, selected trips, and the camera position.
Map removal also disconnects its theme subscription.
Stop and current-location circles use full emissive strength so day/night
basemap lighting does not dim their colors, including the selected-stop highlight.
Map marker popups use the app's surface/text tokens for readable Light/Dark
content, matching pointer arrows, and visible close-button focus states.

Go on a route's stop detail opens a destination picker with the current route, direction,
and boarding stop. Destinations are limited to subsequent stops in route order.
Get off at opens a picker that takes over the sidebar instead of a dropdown or
page-wide overlay. The trip view is hidden until a stop is selected or the picker
is dismissed, without discarding its current destination or loaded trip times.
Each stop lists the other
routes reported at that exact stop, without duplicating the current route or
combining opposite-side stops. Connections show route numbers, with full route
names available on hover and to screen readers. Search by stop name, stop number, or connecting
route, then select a stop to update the destination and collapse the picker.
Other-route metadata loads when the picker expands and is reused while it
remains mounted. Loading failures offer retry without blocking stop selection;
Cancel or Escape keeps the existing destination and restores button focus.
The Cancel action stays visible while scrolling the stop list.
The destination-selection map matches the open picker: it shows downstream stop
markers and fits the route from the boarding stop to the terminus, both before
and after a destination is chosen. The boarding pin stays visible for context;
neither earlier stops nor the boarding stop appear as destination choices.
Searching the list does not hide map markers. Hovering or
keyboard-focusing a destination highlights and enlarges its map marker without
moving the map. Highlights clear when no stop is hovered or focused, or when
searching or dismissing.
The boarding stop is read-only here: go back to change it. The header shows the route
and selected destination (or route direction until a destination is chosen).
The trip-times and trip-detail maps show the selected route segment and labeled
boarding/destination markers, fitting both stops and the intervening road geometry
with padding that adapts to the map panel's size. Selecting both stops also displays matched
departure and arrival times directly beneath the destination picker, including travel
duration, refresh/retry, and explicit unavailable predictions. Departure and arrival
have separate, stop-labeled columns with emphasized times; ride duration appears
below the arrival.
View destination arrivals opens a trip-times
view with the selected route, direction, boarding stop and destination retained
in the URL. It requests both stops together and matches predictions by trip ID,
showing boarding/departure time, corresponding destination time, and their
approximate travel duration. Estimated and scheduled times are labeled separately
and displayed in Portland's Pacific time, with dates for trips after midnight.
Times refresh every 30 seconds and can be refreshed manually. Missing matching
destination predictions remain explicitly unavailable; unrelated buses, canceled
trips, uncertain predictions and drop-off-only boarding stops are never used to
invent a journey. This is a same-route stop-time comparison, not a transfer planner;
boarding times use TriMet stop predictions rather than guaranteed departures.
Each trip row is a keyboard-accessible link; selecting anywhere on it opens
`/nearby/directions/trip` for that specific departure. The URL retains the route,
direction, boarding stop, destination, departure ID, and reported trip ID.
The trip view shows only that departure's matched times and ride duration, with
refresh/retry and a back link to the originating trip list. A missing or no-longer
reported departure never silently selects another trip. Reported departures
remain visible in the trip view after their departure time passes.
The route stop detail's Departures and Stops panels use independent native
disclosures with clock/stop icons. Both start expanded and support keyboard
activation without clearing their data when collapsed.
Departure badges indicate whether a prediction is late, on time, or early;
scheduled-only departures do not imply a live prediction.
The stop view's route badges filter Departures: select multiple routes to combine
them, and deselect all to show every departure. A selected route remains available
if its departures disappear. Departures can also be grouped by route using the
control in the Departures header; ungrouped departures remain in time order.
The From selector lists every stop in route order for the selected direction;
changing it updates the URL, departures, stop details, Go action, downstream
stops and map. A stop with no departures remains selectable.
The Stops panel shows reported estimated or scheduled arrival times for the
selected departure's exact trip. Predictions and departures refresh every 30
seconds; failed refreshes can be retried and retained times are labeled. TriMet
limits requests to 128 stops and a 60-minute `minutes` setting; its arrival
limits can omit later trips, so missing matches are shown as not reported rather
than inferred. Stops repeated in the route are
also unavailable because the arrivals response does not identify their sequence.

Route geometry is generated from `scripts/tm_routes.json` using `npm run trimet`
and served from `public/data/trimet/geoJSON`. The exporter groups every feature
for a route/direction, joins touching segments, and retains disconnected parts as
MultiLineStrings rather than overwriting earlier segments or inventing connections.
The map loader also accepts the existing line-based GeometryCollection assets.

The app shell follows the Wintermuted docs-topbar pattern used by Game of Life
and Inventory: compact branding, underline-active navigation, consistent page
gutters, and a quiet footer with source/releases links and theme controls.
The theme toggle matches Game of Life: its icon and label name the theme that
clicking will activate. Existing System preferences remain respected until the
user chooses Light or Dark. The footer remains always visible.

Restart a running Vite development server after upgrading this package to clear
cached package exports.

Run `npm run test:ui` for focused DOM integration tests covering navigation,
bookmarks, dialogs, and theme preferences. Preview and production deployment
workflows run these tests before the existing CRA production build. Local
development continues to use Vite; build/type validation stays in CI.

## GitHub Copilot app

Review and accept `.github/github-app.yml` in the app to enable the repository
scripts. Node.js 20.19.6 (see `.nvmrc`) and npm must be available on your PATH.

- **Setup** runs `npm ci` automatically when a new session is created. Wait for
  setup to finish before starting the dev server; it can also be rerun manually.
- **Run** starts the Vite dev server with `npm run watch`. The app detects its
  local URL and opens it in the integrated browser.

Merge the configuration into the default branch to make it available to new
sessions created from that branch.
