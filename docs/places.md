# Places and map layers

[Documentation](README.md) / [Project home](../README.md)

Open **Places** from Nearby (`/nearby/places`) to browse Portland destinations. Listings and reference layers are snapshots, not guarantees of current access, operating hours, or accessibility.

Jump to [search](#search-all-places), [saved places](#save-places-and-manage-bookmarks),
[shared views](#share-a-view-and-understand-privacy), [trip corridors](#places-along-a-trip),
or [map layers](#neighborhood-boundaries).

## Browse and filter places

**Places** starts with Parks, Food-cart pods, Community centers, Libraries,
Community gardens, Farmers markets, Public restrooms, Heritage trees, Grocery
stores, Reuse & repair, CSA pickups, Drinking fountains, Park artwork, Museums,
Art galleries, Theatres, Arts & cultural centres, Viewpoints & observation decks,
Playgrounds, Splash pads, Historic landmarks & monuments, Public art & murals,
Sports courts, Skateparks, Visitor gardens and Nature reserves enabled.
**Bicycle parking**, **Picnic & seating**, **Cafés** and **Bakeries** are opt-in
categories so dense inventories and commercial listings do not obscure other places. Its list follows the
visible map area after a pan or zoom, independently of transit's search radius.
Category toggles and name/address search filter both the map and list. Numbered
clusters pair the category icon with a count and expand when selected; green
tree, orange food, purple community, blue book, olive leaf, berry basket,
teal restroom, brown seedling, brick shopping cart, forest-green recycle,
ochre carrot, royal-blue bicycle, gold landmark, plum gallery, rose theatre masks
and indigo paintbrush icons
identify individual locations. The added outing categories have their own colored
icons, including binoculars, playground child, water, monument, spray can,
basketball, skater, spa, mountain, coffee and bread. Category controls use compact
single-line rows. Overlapping markers
offer a location chooser, and every in-area
location is also selectable in the keyboard-accessible list. **Show more places**
reveals additional results without silently limiting the catalog.
If marker rendering fails, the current map-area list remains selectable without
panning or zooming; use the inline retry indicator to restore markers.

## Search all places

The navigation bar's **Search all places** searches every published category across
Portland, including disabled categories and places outside the current map, saved
view or trip corridor. It matches names, category labels, addresses and source-listed
types, ignores accents and supports multiple search terms. Exact and prefix name
matches appear first; results use the same category icons and theme-aware colors
as Places, with matching text highlighted in names and descriptions.
**Show more places** exposes additional matches. Search
uses the most recently shared device location to sort equally relevant matches
nearest first, while retaining exact/prefix name priority. Without a shared
location it retains alphabetical tie-breaking. Each result shows its straight-line
distance from the shared position in feet below one mile or miles otherwise;
distances are omitted when no device location is available. Search never requests location
permission itself, uses neither map centers nor dropped pins as a device location,
and keeps the shared position only in memory for the current page session.
A subsequently denied location request clears the proximity preference.
The catalog
loads on first search interaction rather than on every page visit. Partial failures
show an inline error tooltip and source-specific retry beside **All places**, while
loaded results stay usable. Arrow keys or Tab browse result links; Escape dismisses
the results. Choosing a result opens its existing details and centers its marker
without changing map filters. The field stays visible when the mobile menu is closed.

## Direct links and navigation

Each place has a directly loadable URL at `/nearby/places/:placeId` (the source ID
is URL-encoded). Result and overlapping-marker links support opening in a new tab;
map selection also updates the URL. Reloading or sharing a detail URL restores that
place independently of the current category filters, with its marker centered.
Missing or unavailable places show a specific not-found/loading/retry state.
The **header Back** returns from details to the Places list and restores its map
view; the list's header Back returns to Nearby. There is no inline Back button.
Browser Back/Forward restores URL-selected details, and a place-linked planner's
header Back returns to that place. Filters and neighborhood settings are kept
while navigating within the mounted Nearby view.

## Discovery presets

**Discovery preset** offers **Park day**, **Errands** and **Bike outing** category
and reference-layer combinations. Manual changes show **Custom filters**.
**Reset filters** restores the default categories/layers and clears saved-only
and trip-corridor filtering without moving the map.

## Discovery controls and errors

**Discovery tools**, **Place categories** and **Map layers** are independent,
keyboard-accessible collapsible sections, initially closed to keep search and
results accessible. Expanding or collapsing them does not change active filters,
saved places, overlays or the map. Their open state is retained through place
details and header Back within the mounted Places view. Search and results remain
outside these sections. Source/drawing failures appear as an inline warning and
retry button beside the affected category or layer, not a separate error paragraph.
Collapsed groups/sections retain an aggregate indicator and retry only their failed
sources. The tooltip preserves the full failure message, including any retained
snapshot; individual retries leave other filters and layers unchanged.

## Category groups and layer help

Place categories are nested under **Parks & nature**, **Food & markets**,
**Community & resources**, **Arts & culture**, **Play & recreation** and **Trip amenities**. Each group checkbox enables or
disables all its categories without changing other groups, search or map layers.
A mixed checkbox means only some child categories are enabled; selecting it
enables the whole group. Individual category toggles remain available, and group
states follow presets and shared views without changing existing defaults.
Each group starts collapsed. Its title/chevron button independently shows or hides
the children; the adjacent bulk checkbox works without expanding the group.
Tree, basket, people, landmark, runner and signpost icons distinguish the six group
headers, using theme-aware category colors.
Children use a consistent single-column layout, indentation and spacing.
The Places header's **About Places** help tooltip contains the browsing
description; the list does not repeat the visible header title or introduction.
Map-layer descriptions and cautions are available from right-aligned help buttons
beside each toggle. Help opens over the map to the right of the sidebar (over the
map below on narrow screens), outside the sidebar's scroll clipping. It supports
hover, focus and touch, and dismisses with Escape or an outside tap. Loading uses
an inline spinner. Zoom requirements use an amber warning beside the layer, with
the exact zoom message in its tooltip and no misleading retry button. These
warnings also remain discoverable on the collapsed Map layers section.

## Save places and manage bookmarks

Save places from a result row or its detail view. **Saved places only** shows
matching saves across Portland, not just the visible map; category and search
filters still apply. Saves contain only source IDs and display names in this
device's local storage (`SAVED_PLACES_V1`), with cross-tab updates and explicit
storage-error/retry controls. In Places nearby, unavailable saved records can be
removed once the catalog has loaded. The **Bookmarks** page also lists every saved
place with its category icon, a link to its detail view and a remove control, independently of
map filters or catalog availability. Its empty state links to Places nearby;
storage failures have inline error/retry controls. Place saves retain their own
storage, separate from transit stop/route bookmarks and groups.

## Share a view and understand privacy

**Copy view link** captures a snapshot of categories, search, optional layers
and the current map position. Reopening it restores those public settings;
the address bar is not rewritten on every pan or filter change. Shared settings
also survive place details and the place-linked planner's header Back.
Saved IDs, device location and current trip geometry are not included. Search
text and viewport coordinates are included, so check them before sharing.
If clipboard access fails, a selectable link is shown. Unsupported or malformed
settings show an error instead of partially applying filters.

## Places along a trip

Select a planner itinerary and use **Places along this trip** to discover places
within approximately **250 m**, **500 m** (default), or **1 km** of its mapped
segments. The blue trip line and results use the selected itinerary's existing
geometry, never a hovered alternative or an invented line across missing legs.
This is straight-line proximity, **not walking distance, verified access, or a
reachable detour**. Missing leg geometry is excluded and disclosed; walking
geometry still requires the existing walking-routing opt-in. The trip button is
unavailable when no usable geometry exists. Corridor filtering covers the full
mapped trip rather than only the viewport, and can intersect saved/category/search
filters. **Return to trip planner** retains the planner query; it may reload trips
and does not preserve the exact selected itinerary. The corridor lasts only in
the mounted Nearby session, not across reloads or shared links.

## Place details and planning a visit

Hovering a marker previews its name, category, and any available address;
cluster previews show the category and count. Clicking a marker or selecting a
list result opens a focused sidebar detail view with its source, any available
address/website, source date when available, and **Plan a trip here**. The **header
Back** restores browsing without resetting filters and returns keyboard focus
to the result when it is still listed. Planning preloads the sidebar planner with a named coordinate destination.
`fromPlaceId`/`toPlaceId` retain identity only when the linked coordinates match
the local snapshot; changing a coordinate clears that identity. Swapping the
endpoints moves the name with its coordinates. Place handoffs require **Find trips**
confirmation: map points are approximate, **not verified public entrances**.
Edit to a known public entrance/address when needed. Parks-system property data
also includes community gardens, natural areas, plazas, and facilities; inclusion
does not establish public access, operating hours, or accessibility.
When the garden snapshot is available, garden-specific Parks entries sharing a
City property ID are shown only in Community gardens, even if that category is
disabled. Host parks remain in Parks, distinct garden areas are retained, and
Parks entries remain available if the garden source fails to load. Existing
park destination links still resolve against the unchanged parks snapshot.

## Gardens and farmers markets

Gardens may require plot registration or have restricted access. Market details
show **Source-listed schedule**, explicitly warning that seasonal dates and hours
may be old; check the market website before traveling. No live open/closed state,
current-year schedule, or benefit/payment availability is inferred.

## Public restrooms

Public restrooms currently cover **Parks-system restroom rooms**, not every
restroom in Portland. Separate rooms at the same building remain selectable
through clusters/the overlapping-marker chooser. Source-closed rooms and records
without mapped coordinates are excluded. Unknown opening status remains unknown;
even **Listed 24/7** is source information, not live availability. ADA designations
are source-listed, not verified accessible routes. Seasonal closures, fees and
building access restrictions may apply.

## Heritage trees

Heritage trees retain their public tree number, common/scientific species name,
source-listed setting and site address. Removed, Merit and delisted records are
excluded. Search also matches scientific names. Points mark trunks, not public
entrances: trees may be on private land or not visible from public paths. View only
from lawful public access; do not enter private property. Tree-owner names and
contact information are not requested or published.

## Groceries, reuse, CSA pickups, and bicycle parking

Grocery stores exclude source-closed records; their hours and stock are not live.
Resourceful PDX organizations show source-listed services and items for reuse,
repair, lending, swaps, and donations; confirm eligibility, accepted items,
appointments, fees, and access before visiting.
CSA (community-supported agriculture) pickups retain farm names, specific numbered
site addresses, and listed seasons/products. Vague city, ZIP-code, street-only,
or unnamed-site entries are not turned into routable destinations. Membership,
arranged collection, and site permission may be required: these are not public
markets or verified current schedules.
Bicycle parking uses individual public-right-of-way rack assets, not a second
overlay of parking areas or bike-share stations that could double-count racks.
Counts mean **racks, not spaces**; capacity and cover are source-listed and unknown
values stay unknown. Neither availability, condition, security, nor access is
guaranteed. Planning routes to an approximate point; it does not reserve parking
or switch the transit planner to cycling mode.

## Origins and navigation state

An existing explicitly selected Nearby origin is reused and identified as a
device location, search center, or dropped pin; simply panning Places never
changes that origin. With no origin, choose one in the planner. Places does not
wait for Nearby's background location request or require nearby transit results.
Its routing links gain the device origin when it becomes available. Filters,
selection, and Places viewport survive switching between Nearby tabs. Browsing
downloads same-origin static snapshots, not live third-party place searches.
Planning retains the existing coordinate-link privacy and walking-estimates opt-in.

## Neighborhood boundaries

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

## Trails and bicycle reference layers

Three additional **Map layers** are independent, off by default, and downloaded
only when enabled:

- **Park trails**: green dashed existing trail centerlines. Water trails,
  maintenance roads, retired CAT roads, proposed/informal/closed segments and
  unmapped records are excluded. Unspecified trail types remain identified in
  the source data. A trail line does not establish public access, accessibility,
  or permission to cycle.
- **Bicycle network**: blue active infrastructure, including different facility
  types, not only protected lanes. Planned, future-development recommendations,
  retired segments and undefined statuses are excluded.
- **Recommended bike routes**: the City's separate recommended cycling map,
  in amber. Red dashed connections are difficult, moderate/high-traffic, or
  unclassified, not an assurance of a comfortable or protected ride.

The Bicycle Network source's `RECOMM` status means **recommended for future
development**, not the recommended-routes map. These are deliberately not mixed.
All line layers are reference overlays, not selectable place destinations or a
turn-by-turn/cycling routing engine. Verify signs, legal direction, trail rules,
closures and current access. Directions may differ by travel direction; no
one-way permission is inferred from line geometry. No live-condition, safety or
accessible-route guarantee is made.
Layer controls carry color/pattern swatches; point discovery and transit planning
are unchanged. Enabled lines sit above neighborhood fills and below POI markers,
retain their settings during Nearby navigation, recover on map-style reloads,
and have independent loading/errors/retry. Loaded data are cached for the session.

## Park amenities

**Drinking fountains**, **Picnic & seating**, and **Park artwork** use the Parks
Amenities inventory. Each marker is an individual source-active asset, not a
park entrance or a reservable picnic area; removed/closed assets are excluded.
Asset types/styles are searchable. Some fountain assets are dog bowls. Water
service, potability, seasonal operation, availability, fees and accessible
approaches are not verified. Artwork names identify inventory assets, not
verified artwork titles or a complete public-art directory.

## Walking and street-tree context layers

Four additional opt-in **Map layers** provide walking context:

- **Street trees**: the active street-tree inventory, distinct from heritage
  trees. Inventory locations do not guarantee a living tree, shade or access.
- **Sidewalks**: actual asset polygons, including ramps, driveways and pads.
  An inventory gap does not prove a sidewalk is missing.
- **PedPDX crossings**: the 2023 planning inventory where crossings meet the
  Pedestrian Priority Network, not every city crossing.
- **Crossing deficiencies**: orange points for historical arterial-crossing
  planning findings, not live closures or a safe/unsafe routing classification.

Hover these context layers for source details; they are not place destinations
or a walking/accessibility routing engine. Neighborhood fills remain underneath,
with route lines and selectable POIs above. Street trees and sidewalks require
zoom 14 or closer; mapped crossings require zoom 13. Deficiencies can show at
any zoom. The UI explains when to zoom in.

For source attribution, licenses, snapshot dates, spatial tiles, and refresh procedures, see [place-data maintenance](place-data.md).
