# Trip planning and walking estimates

[Documentation](README.md) / [Project home](../README.md)

Open **Plan a trip** in Nearby (`/nearby/planner`) or the standalone `/planner` page. Both use the service-wide stop catalog. For endpoint link formats and the Nearby workspace's background location behavior, see [Nearby workspace and location](nearby.md#nearby-workspace-and-location).

## Choose stops and locations

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

## Saved stops and recent trips

Assign a bookmarked stop to **Home** or **Work** on the Bookmarks page to put
it in **Saved stops** in both planners. Optional bookmarked commute routes
appear alongside those stops in the homepage's Bookmarks preview. Replace a
shortcut by choosing another bookmark, or clear it with **Not set**. This
feature saves public transit IDs in your browser, not addresses or device
coordinates.
The searchable **Recent trips** dropdown in the sidebar reopens up to five successful stop pairs
stored in this browser by either planner view. Choosing a pair fetches fresh
itineraries instead of reusing old departure times.

## Choose and edit an itinerary

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

## Directions and trip paths

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

## Enable walking estimates and understand privacy

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

## Walking API behavior and limitations

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

Discover [places along a selected trip](places.md#places-along-a-trip). Same-route departure comparisons are described in [Nearby](nearby.md#compare-departure-and-arrival-times).
