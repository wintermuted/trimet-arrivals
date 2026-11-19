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
Explore shows sidebar and map placeholders while waiting for device location.
The map placeholder clears when the map is ready; the sidebar placeholder stays
until nearby results are ready or the request reports an error.
The **Vehicles** map control shows reported in-service bus and train positions
throughout the current viewport, independently of the nearby-stop radius or
selected route. It starts on and retains its setting while the Nearby map stays
mounted, including when switching between Explore and Plan a trip. Separate
line-detail maps are unchanged. Bus and train symbols identify the mode; a small
arrow shows heading when available, and route labels appear when zoomed in.
MAX and Streetcar vehicles use their line names (for example, **Red** or
**A Loop**) rather than internal route numbers; regular buses retain their route numbers.
Vehicle badges and labels use the reported route-line color, with contrasting
black or white bus/train glyphs for legibility (including the yellow line).
When no valid route color is supplied, the badge uses the app's standard transit blue.
Hover a vehicle (or tap it) to see its vehicle ID, route, direction description,
trip ID, destination sign, and last position-report time. Route descriptions
load on demand and are cached only while the overlay is enabled. Missing fields
and unavailable route descriptions are labeled explicitly; direction codes
are never guessed to mean inbound or outbound. Hover details close on mouse
leave. Click or tap a marker, or use **Choose a vehicle** and **Vehicle details**
below the map, to pin the same popover. Close it with its close button, Escape,
or a click elsewhere on the map.
Choose **Follow trip** in the pinned popover to show that vehicle's current run
as ordered stop-to-stop legs in the sidebar (not a new multimodal itinerary).
The map centers on its marker as positions update, even outside the original
viewport. Earlier legs collapse, the current leg advances with reported stop
progress, and upcoming legs show estimated or scheduled stop times. Canceled
and drop-off-only stops are labeled. Progress without vehicle-distance data is
explicitly schedule-based; unavailable updates retain labeled last-known legs.
Tracking pauses if positions expire or updates pause, and does not switch
silently when the vehicle starts another trip. **Back** in the following sidebar's
shared header returns to the referrer URL captured when following began, including
its query and hash. Using Back, or disabling
Vehicles, returns to the previous sidebar; an open planner retains its draft
and results. Tracking requires reported trip and block IDs.
While following, **North-up** keeps a flat, north-oriented map. Choose
**Chase view** for a closer 60-degree, heading-oriented view with the vehicle
below center and the road ahead visible. The existing Mapbox Standard basemap
supplies 3D buildings where available. Camera turns take the shortest path
across north, hold the last orientation when headings are missing, and move
briefly with position reports rather than simulating continuous driving.
Reduced-motion preferences make camera changes immediate. The chosen view
lasts for the mounted Nearby session; stopping tracking or disabling Vehicles
restores the camera position, zoom, pitch, and bearing from before following.
While following, positions are requested by vehicle ID rather than viewport,
and compact block-status responses supply the exact trip's ordered stops.
The [block-status API](https://developer.trimet.org/ws_docs/block_status2_ws.shtml)
is used because the documented trip-status filters returned system-wide data
in live checks. Trip progress refreshes with successful position polls, with
separate cancellation and bounded error backoff.
Positions refresh approximately every 15 seconds after the previous request
completes, and after map movement when not following a vehicle. Hidden tabs pause updates; disabling Vehicles
cancels requests and clears its in-memory data. Updates use the viewed map bounds
and the existing TriMet AppID, without requiring device location or storing
coordinates. The overlay moves briefly to newly reported coordinates, then
stops; this is not a prediction or a guarantee of continuous GPS tracking.
Reduced-motion preferences disable these transitions. Reports disappear at
TriMet's expiry or after 90 seconds of observation age, whichever comes first.
Unavailable, expired, and partial updates are labeled rather than presented as
current; temporary failures use bounded retry backoff, and **Retry vehicles**
requests a fresh start. TriMet does not publish a refresh guarantee or numeric
request quota in its [vehicle API documentation](https://developer.trimet.org/ws_docs/vehicle_locations_ws.shtml).
Nearby removes the main content's outer gutters so the map reaches the available
edges; the results sidebar retains 14px horizontal padding only, with no top/bottom
gutter. The sidebar detail header spans the full available sidebar width while its
contents align with the padded content below. Other pages keep the standard content spacing.
The Nearby landing screen offers **Explore** (`/nearby/simple-routes`) and
**Plan a trip** (`/nearby/planner`), plus **Places** (`/nearby/places`) for parks,
food-cart pods, community centers, and libraries as tiles. Each view has a back link to the
landing screen. Going back clears the nearby stops, route lines, and location
circle and restores the Portland overview without remounting the map. The sidebar planner
uses the service-wide stop catalog and works without a nearby location or
nearby results. Standalone `/planner` links still work; both planner views
support `from` and `to` stop links. Use **Other origin options** or
**Other destination options** to enter a place, street address, or decimal
coordinates (longitude, latitude). TriMet geocodes place names and addresses;
try the street address without city or state if a full address is not recognized.
Typed endpoints can be linked with `fromPlace`/`toPlace` or
`fromCoord`/`toCoord`, including in combination with a stop. These inputs are
visible in the link but are not added to Recent trips.

### Nearby places

**Places** starts with Parks, Food-cart pods, Community centers, and Libraries
enabled. Its list follows the
visible map area after a pan or zoom, independently of transit's search radius.
Category toggles and name/address search filter both the map and list. Numbered
clusters pair the category icon with a count and expand when selected; green
tree, orange food, purple community, and blue book icons identify individual locations. Overlapping markers
offer a location chooser, and every in-area
location is also selectable in the keyboard-accessible list. **Show more places**
reveals additional results without silently limiting the catalog.

Hovering a marker previews its name, category, and any available address;
cluster previews show the category and count. Clicking a marker or selecting a
list result opens a focused sidebar detail view with its source, any available
address/website, source date when available, and **Plan a trip here**. **Back to
places** restores browsing without resetting filters and returns keyboard focus
to the result when it is still listed. Planning preloads the sidebar planner with a named coordinate destination.
`fromPlaceId`/`toPlaceId` retain identity only when the linked coordinates match
the local snapshot; changing a coordinate clears that identity. Swapping the
endpoints moves the name with its coordinates. Place handoffs require **Find trips**
confirmation: map points are approximate, **not verified public entrances**.
Edit to a known public entrance/address when needed. Parks-system property data
also includes community gardens, natural areas, plazas, and facilities; inclusion
does not establish public access, operating hours, or accessibility.

An existing explicitly selected Nearby origin is reused and identified as a
device location, search center, or dropped pin; simply panning Places never
changes that origin. With no origin, choose one in the planner. Opening Places
does not request device location or require nearby transit results. Filters,
selection, and Places viewport survive switching between Nearby tabs. Browsing
downloads same-origin static snapshots, not live third-party place searches.
Planning retains the existing coordinate-link privacy and walking-estimates opt-in.

In Places, **Map layers > Portland neighborhoods** adds labeled neighborhood
association boundaries beneath place markers. It is off by default and loads
only when enabled; the setting survives Nearby/planner navigation. It does not
filter places or change routing. Shared boundary areas can overlap, and labels
appear when zoomed in. These are bylaw boundary areas for context, not legal
boundaries or destinations. Layer errors have an independent retry and do not
disable place discovery.
Enable **Show neighborhood polygons** for visibly tinted areas and stronger
colored outlines in addition to the labels. Turn it off for labels/outlines
without area fills. Both controls are independent of place categories and
retain their settings while navigating Nearby; shared areas may overlap.

#### Refreshing place snapshots

```powershell
npm run places:refresh
```

The script queries all City of Portland park properties (object-ID batches avoid
the service's 200-record response limit), and OSM `amenity=food_court` features
inside Portland's named administrative boundary (`admin_level=8`, `wikidata=Q6106`).
Pods must have explicit cart/pod/food-park naming, an outdoor retail-area mapping,
or a separately reviewed known-pod name. Generic indoor food halls, unnamed
courts, private/closed/disused entries and individual food vendors are excluded.
Name/proximity duplicates are consolidated, preferring area representations.
This intentionally conservative interpretation is **not a complete pod directory**.

Community centers and public libraries use Metro's official RLIS point datasets,
not OSM. Queries retrieve every matching object ID in validated batches and keep
Portland-addressed Oregon records; these can include nearby unincorporated areas.
Centers include public-serving nonprofits and social/program facilities, not only
city recreation centers; eligibility requirements and fees may apply.
Academic/administrative library records are excluded. The library layer is older
than the centers layer, so its actual data-edit date is shown separately from
schema edits and retrieval. Two known outdated branch locations (Albina and
Northwest) have reviewed address/coordinate corrections from the official library
pages' TriMet links, reviewed November 18, 2026. Hillsdale is omitted while its
official page lists a construction closure. Recheck these corrections and the
Hillsdale exclusion against <https://multcolib.org/hours-and-locations> on refresh.
Do not treat any snapshot or corrected point as live access/entrance information.

Neighborhood polygons come from the City's **Neighborhood Boundaries** layer
(Bureau of Planning and Sustainability), including shared areas. All object IDs
are fetched in validated batches and preserved as polygon/multipolygon geometry
at six decimal places, not replaced with bounding boxes or display points.
To refresh only this layer without querying OSM or changing place snapshots:

```powershell
npm run places:refresh -- --neighborhoods-only
```

The normal full refresh includes neighborhoods too.

Refresh manually when maintaining the catalog (monthly is a reasonable starting
cadence), and review names, counts, additions/removals, source dates, and arrival
points before publishing. Retrieval dates are not source update dates. Overpass
mirrors can be stale or rate-limited; the UI exposes the OSM database timestamp
separately. There are no automated retries or scheduled jobs. On source errors,
invalid data or incomplete pages, the command fails without publishing partial
snapshots; previous files remain usable.

If Overpass returns 429 or is unavailable, wait or set `OVERPASS_URL` to a trusted
public Overpass interpreter. To import an already downloaded **complete raw response
to the same query**, retain its `osm3s.timestamp_osm_base` and use:

```powershell
npm run places:refresh -- --osm-input "C:\path\to\portland-overpass-response.json"
```

City and Metro data are still fetched and validated in this mode. `npm run test:places-data`
checks ingestion and safe replacement without querying external services.
The checked-in initial OSM response is from July 2026; it is not represented as a
current November directory.

Snapshots live separately under `public\data\places\parks.json` (City of Portland,
PDDL default terms), `food-cart-pods.json` (OpenStreetMap contributors, ODbL),
and `community-centers.json` / `libraries.json` (Metro, RLIS Open Database End User
License Agreement). Each retains its source, license, retrieval date and limitations;
`neighborhoods.json` is a separate City of Portland polygon snapshot under the
same City PDDL default terms.
OSM and Metro snapshots also retain the source database/data-edit date. See
`public\data\places\NOTICE.txt`. These data licenses are separate from the app code's
MIT license. Recheck upstream metadata/terms before future redistribution.

### Transit planning and location

The location-arrow button beside either stop selector asks for device location and finds a public TriMet
stop within one mile locally. The planner uses the selected stop ID, not the
device coordinates, in requests, links, or Recent trips.
The **Swap origin and destination** icon between the fields reverses the draft inputs, including mixed
stop and location types. The displayed trip stays unchanged until you use **Find trips** and get new results.
Choose **Plan a trip to this stop** on a Nearby stop detail page to open the
sidebar planner with that exact destination selected.
Both stop pickers group stops by the Portland quadrant prefix in their
published names. Stops without an unambiguous prefix appear in **Other stops**.
Icons identify bus, rail, streetcar, or aerial tram service when TriMet reports
it for that stop. Stops can show more than one mode.
Open stop menus can extend past the sidebar so longer names are easier to scan.
Each option shows named route badges below the stop name, using published
colors for MAX, FX, Portland Streetcar, and WES when available.
Regular bus badges use the same blue as bus legs in the planner.
**Common places** suggests verified stops for familiar destinations, including
Washington Square Transit Center (the mall's transit stop, not its entrance),
Washington Park MAX Station for the Oregon Zoo, and the airport MAX station.
The menus show a sample from each group; type a stop name, stop ID, or route
name (such as **FX2**) to search the full TriMet catalog.
Assign a bookmarked stop to **Home** or **Work** on the Bookmarks page to put
it in **Saved stops** in both planners. Optional bookmarked commute routes
appear alongside those stops in the homepage's Bookmarks preview. Replace a
shortcut by choosing another bookmark, or clear it with **Not set**. This
feature saves public transit IDs in your browser, not addresses or device
coordinates.
The searchable **Recent trips** dropdown in the sidebar reopens up to five successful stop pairs
stored in this browser by either planner view. Choosing a pair fetches fresh
itineraries instead of reusing old departure times.
After a successful search, **Plan a trip** shows the origin and destination.
In Nearby, a circle and destination pin connected by a dotted line identify the
two endpoints in both the summary and the form.
**Edit stops** or **Edit locations** in the header reopens the form; the last successful results stay visible
and labeled until another search returns trips.
Collapse **Plan a trip** without clearing your stops or results,
or **Choose a trip** to hide the options without changing the selected trip.
Trip options start unselected. Choose one to see its summary and directions,
or use **Edit trip** in the header to switch options without clearing the current trip first.
Each option shows its planned departure, arrival, duration, and the walking and
transit legs in order, with mode icons in the map's route colors.
The collapsible **Directions** section shows mode icons alongside written
instructions, with dividers between each leg and a dotted line connecting each
leg's start circle and destination pin.
After choosing a trip in Nearby, use **Get directions** at the bottom of the
sidebar for ordered walking, boarding, and exit steps with TriMet's planned
times. It does not track location or show live updates. **Back to planning**
returns to the selected trip.
In Nearby, hover a leg in the directions or on the map to highlight it in both
places. Keyboard focus on a direction also highlights its path when available.
Nearby draws available trip paths together. MAX, streetcar, and FX paths and
direction icons use their published line colors. Regular bus stays blue, and the
walking icon is green. The selected trip
has a thicker stroke and a light outline, while alternatives are muted.
Hover or focus a trip option to preview its available paths with that emphasis,
without changing the selected trip or its stop markers.
The map uses published transit shapes matched to the
itinerary's boarding and exit stops. Only boarding and exit stops for the
selected option are marked while planning; Nearby markers return in Explore.
Select a trip marker for its stop name, ID, and the routes to board or leave there.
With **Walking estimates** enabled,
Mapbox estimates the walking paths from TriMet's leg endpoints, including
transfers. Dashed lines distinguish these paths from transit. Legs without
usable path data are omitted rather than replaced with straight lines.
Detail headers use an accessible back-caret link before the title rather than an
outlined Back button.
Departure rows support mouse and keyboard selection, with a highlight and caret
identifying the selected departure. Selection persists across updates while that
departure remains available; otherwise the first departure is selected.

On the Nearby Directions map, hover over or tap a downstream stop to see its name,
stop ID, and route, then choose **Set as destination** to update the sidebar.

Explore groups stops by route and direction, with service icons on route badges
and stop IDs separated from stop names for easier scanning.
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
walking catchment. The Nearby landing map opens on a Portland-area overview without
requesting your location. **Explore** centers and zooms the map as soon as your
device location is available, without waiting for stops to load. If location is unavailable or permission is denied, use
the map to search instead or retry after changing browser permissions. Move the
map and choose **Search this area** to search its center, or **Drop pin at map center** and drag the pin to move
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
map; closing restores the nearby markers and previous map view. Nearby also
draws the routes serving the loaded stops without changing the map center or
zoom. The route lines use the checked-in geometry snapshot, which may lag
current stop information.
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
the nearby radius, and list the routes serving that stop. Use **Bookmark this stop**
to save it to Bookmarks, or **Remove stop bookmark** to unsave it.

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
Back or Escape keeps the existing destination and restores focus to **Get off at**.
The picker header and search field stay visible while scrolling the stop list.
Before a destination is chosen, the map shows downstream stop markers and fits
the route from the boarding stop to the terminus. Once you choose a destination,
the map shows only the boarding and arrival pins and the route between them.
Reopen **Get off at** to show all eligible downstream stops again. Going back
returns to the selected route without changing the destination.
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
Upcoming trips use the planner's card layout, with the time range and ride duration
above the route and prediction status. Each card is a keyboard-accessible link that opens
`/nearby/directions/trip` for that specific departure. The URL retains the route,
direction, boarding stop, destination, departure ID, and reported trip ID.
The trip view uses the planner's connected boarding and destination stops, with
that departure's matched times shown at each stop and the ride duration below. It includes
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
