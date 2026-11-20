# Vehicles and trip following

[Documentation](README.md) / [Project home](../README.md)

Use the Vehicles control on the [Nearby map](nearby.md) to inspect reported vehicle positions.

## Vehicle markers

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

## Inspect vehicle details

Hover a vehicle (or tap it) to see its vehicle ID, route, direction description,
trip ID, destination sign, and last position-report time. Route descriptions
load on demand and are cached only while the overlay is enabled. Missing fields
and unavailable route descriptions are labeled explicitly; direction codes
are never guessed to mean inbound or outbound. Hover details close on mouse
leave. Click or tap a marker, or use **Choose a vehicle** and **Vehicle details**
below the map, to pin the same popover. Close it with its close button, Escape,
or a click elsewhere on the map.

## Follow a trip

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

## North-up and Chase view

While following, **North-up** keeps a flat, north-oriented map. Choose
**Chase view** for a closer 60-degree, heading-oriented view with the vehicle
below center and the road ahead visible. The existing Mapbox Standard basemap
supplies 3D buildings where available. Camera turns take the shortest path
across north, hold the last orientation when headings are missing, and move
briefly with position reports rather than simulating continuous driving.
Reduced-motion preferences make camera changes immediate. The chosen view
lasts for the mounted Nearby session; stopping tracking or disabling Vehicles
restores the camera position, zoom, pitch, and bearing from before following.

## Trip-status requests

While following, positions are requested by vehicle ID rather than viewport,
and compact block-status responses supply the exact trip's ordered stops.
The [block-status API](https://developer.trimet.org/ws_docs/block_status2_ws.shtml)
is used because the documented trip-status filters returned system-wide data
in live checks. Trip progress refreshes with successful position polls, with
separate cancellation and bounded error backoff.

## Refresh, expiry, and limitations

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

For new multimodal itineraries rather than following an existing vehicle run, see [trip planning](trip-planning.md).
