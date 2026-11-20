# Nearby, stops, and arrivals

[Documentation](README.md) / [Project home](../README.md)

Explore TriMet stops, routes, and reported arrivals around a selected Portland-area location.

Jump to [route browsing](#explore-routes-and-directions),
[area searches](#search-an-area-or-drop-a-pin),
[destination selection](#choose-a-downstream-destination), or
[trip-time comparisons](#compare-departure-and-arrival-times).

## Nearby workspace and location

The Nearby landing screen offers **Explore** (`/nearby/simple-routes`) and
**Plan a trip** (`/nearby/planner`), plus **Places** (`/nearby/places`) for parks,
food-cart pods, community centers, libraries, community gardens, farmers markets,
public restrooms, and heritage trees as tiles. Each view has a back link to the
landing screen. Going back clears the nearby stops, route lines, and location
circle and restores the Portland overview without remounting the map. First
entry anywhere under Nearby requests device location in the background, once
per visit to the Nearby workspace. The launcher, Places catalog, direct details
and planner load independently; navigating between Nearby sections does not
repeat the request. Location-dependent results and place-routing origins update
when the fix arrives, without a reload. Explicit place/shared map views, linked
trips and newer area/pin searches are not replaced by a late background fix.
Location failures have an inline map-control error tooltip and retry. A successful
fix is retained in memory across Nearby sections; leaving and reopening Nearby
starts a new request. The sidebar planner
uses the service-wide stop catalog and works without a nearby location or
nearby results. Standalone `/planner` links still work; both planner views
support `from` and `to` stop links. Use **Other origin options** or
**Other destination options** to enter a place, street address, or decimal
coordinates (longitude, latitude). TriMet geocodes place names and addresses;
try the street address without city or state if a full address is not recognized.
Typed endpoints can be linked with `fromPlace`/`toPlace` or
`fromCoord`/`toCoord`, including in combination with a stop. These inputs are
visible in the link but are not added to Recent trips.

## Select a departure

Departure rows support mouse and keyboard selection, with a highlight and caret
identifying the selected departure. Selection persists across updates while that
departure remains available; otherwise the first departure is selected.

## Set a destination from the map

On the Nearby Directions map, hover over or tap a downstream stop to see its name,
stop ID, and route, then choose **Set as destination** to update the sidebar.

## Explore routes and directions

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

## Search an area or drop a pin

Nearby discovers candidates within the selected **straight-line radius**, not a
walking catchment. The Nearby landing map opens on a Portland-area overview while
requesting your location in the background. **Explore** centers and zooms the map as soon as your
device location is available, without waiting for stops to load. If location is unavailable or permission is denied, use
the map to search instead or retry after changing browser permissions. Move the
map and choose **Search this area** to search its center, or **Drop pin at map center** and drag the pin to move
the search. Both use the selected radius. **Find near me** requests a fresh
device location. The selected location stays in memory only. An empty result
can mean the selected location is outside TriMet's service area.

## Stop markers and route details

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

## Nearby Stops and walking-distance ordering

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

## Choose a downstream destination

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

## Compare departure and arrival times

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

## Open an individual trip

Upcoming trips use the planner's card layout, with the time range and ride duration
above the route and prediction status. Each card is a keyboard-accessible link that opens
`/nearby/directions/trip` for that specific departure. The URL retains the route,
direction, boarding stop, destination, departure ID, and reported trip ID.
The trip view uses the planner's connected boarding and destination stops, with
that departure's matched times shown at each stop and the ride duration below. It includes
refresh/retry and a back link to the originating trip list. A missing or no-longer
reported departure never silently selects another trip. Reported departures
remain visible in the trip view after their departure time passes.

## Departures, filters, and downstream predictions

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

See [trip planning and walking estimates](trip-planning.md), [vehicle tracking](vehicles.md), and [Places](places.md) for the other Nearby tools.
