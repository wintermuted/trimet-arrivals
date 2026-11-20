# Place-data maintenance

[Documentation](README.md) / [Project home](../README.md)

Maintain the static snapshots used by [Places](places.md). Review source-specific limitations before publishing data; retrieval does not establish current operation or public access.

Each source section includes its targeted refresh command. Jump to the
[full refresh](#full-snapshot-refresh-and-food-cart-pods),
[review checklist](#refresh-review-and-failure-behavior),
[Overpass troubleshooting](#overpass-errors-and-raw-input), or
[attribution and licenses](#snapshot-locations-attribution-and-licenses).

## Full snapshot refresh and food-cart pods

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

## Community centers and libraries

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

## Neighborhood polygons

Neighborhood polygons come from the City's **Neighborhood Boundaries** layer
(Bureau of Planning and Sustainability), including shared areas. All object IDs
are fetched in validated batches and preserved as polygon/multipolygon geometry
at six decimal places, not replaced with bounding boxes or display points.
To refresh only this layer without querying OSM or changing place snapshots:

```powershell
npm run places:refresh -- --neighborhoods-only
```

The normal full refresh includes neighborhoods too.

## Community gardens and farmers markets

Community gardens use the City's dedicated polygon dataset, keeping active
garden areas with stable GlobalID-based identities and approximate display
points. Farmers markets use the City's point dataset, excluding records marked
closed or inactive and retaining source-listed days, seasons, hours, and websites.
An active source record does not verify current operation. Refresh just these
two snapshots without changing the existing catalog or querying OSM:

```powershell
npm run places:refresh -- --gardens-markets-only
```

The normal full refresh includes both categories. Review source status,
seasonal schedules, and garden access before publishing.

## Public restrooms and heritage trees

Public restrooms and heritage trees come from the City's **Public Restrooms
(Parks)** and **Heritage Trees** point layers. Complete object-ID batches are
validated before normalization. Restrooms use source object IDs; trees use
official tree numbers. Refresh only these two layers:

```powershell
npm run places:refresh -- --restrooms-trees-only
```

The normal full refresh includes these categories too. Restroom records with
empty source coordinates are omitted with an explicit refresh warning rather
than assigned invented locations; other invalid geometry fails the refresh.
Review closures and public-access caveats before publishing.

## Everyday destinations and bicycle racks

Grocery stores, Resourceful PDX organizations, CSA farm drop-offs, and bicycle
racks use the City's Important Places and Transportation layers. Grocery and
CSA records must be source-listed existing/active. CSA records additionally
need a numbered pickup-site address; nonspecific city/ZIP-code locations are
omitted rather than sending users to geocoded area centers. Reuse/repair records
without mapped coordinates are omitted. These omissions and out-of-coverage
points produce explicit refresh warnings. Other malformed geometry, duplicate
identities, unrecognized statuses, and incomplete pages fail the refresh.
Grocery, reuse, and CSA identities retain their source object IDs; bicycle racks
retain their asset IDs. Co-located farms and racks remain individually selectable.
Personal/contact fields such as CSA email and organization phone are not requested.
Refresh only these four categories without touching existing snapshots:

```powershell
npm run places:refresh -- --everyday-only
```

The full refresh includes these four sources too. Review listed services,
pickup arrangements, source age, and rack metadata before publishing.

## Trails and bicycle overlays

Refresh only trail/network/recommended-route line snapshots:

```powershell
npm run places:refresh -- --overlays-only
```

The full refresh includes these overlays. All matching object IDs are retrieved
in validated batches of at most 200, with complete LineString/MultiLineString
geometry at six-decimal WGS84 precision. The active-network query excludes future
or retired infrastructure at the source, and normalization rechecks status.
Missing geometry and out-of-coverage segments are omitted with explicit warnings;
other invalid geometry, unknown status/connection codes, duplicate identities,
and truncated pages fail without partially replacing snapshots.
`park-trails.json`, `bicycle-network.json`, and `recommended-bike-routes.json`
carry City bureau attribution, metadata, coverage, retrieval dates and PDDL terms.

## Cultural venues

Cultural destinations use named OpenStreetMap `tourism=museum`, `tourism=gallery`,
`amenity=theatre` and `amenity=arts_centre` features inside Portland's administrative
boundary. Listings are incomplete and community-maintained, not a comprehensive
directory or verified operating schedule. Explicitly private and lifecycle-tagged
inactive venues are excluded. Nearby same-name node/footprint representations in
the same category are combined; distinct categories and separately named venues
remain selectable. Points and footprint centres are approximate, not public
entrances. Confirm hours, admission, tickets, reservations and accessibility
with the venue; paid admission is not treated as private access.

The four new snapshots retain OpenStreetMap attribution and ODbL-1.0 terms,
including the source database timestamp. Category-qualified IDs such as
`osm:museum:way:123` keep existing `osm:way:123` food-pod links and saves intact.
Refresh only cultural venues, without changing City, Metro or food-pod snapshots:

```powershell
npm run places:refresh -- --culture-only
```

The full refresh includes these venues too. `--culture-only --osm-input` accepts
a complete raw response to the exported `CULTURE_OSM_QUERY`; partial responses,
missing timestamps, malformed venues and empty categories fail before publishing.
Only names, mapped points, source links, street addresses and safe venue websites
are published; personal contacts and arbitrary OSM tags are not copied.

## Outing destinations

The eleven outing snapshots also use OpenStreetMap within Portland's administrative
boundary: viewpoints/observation towers, playgrounds/splash pads, named historic
sites/monuments, artwork/murals, sports courts/skateparks, visitor-oriented gardens,
nature reserves, cafés and bakeries. `OUTING_OSM_QUERY` and the explicit source-tag
whitelists are in `scripts\refresh-places.mjs`. Generic private/residential gardens,
explicit access restrictions and known inactive/proposed features are excluded.
Visitor gardens require public/visitor access or botanical/arboretum tagging.
Unnamed mapped play, court and artwork assets retain honest category-and-OSM-ID
labels, not invented park names. Adjacent courts and separate café branches remain
distinct; only nearby same-name node/footprint duplicates without conflicting
addresses are combined. Source-listed activity/artwork types are searchable.

All eleven snapshots retain ODbL attribution, source dates and category-qualified
identities. When both sources are enabled, same-name nearby OSM art/garden/reserve
records are hidden behind matching City park/art/garden destinations in discovery.
Different names, distant places and uncertain generic artwork remain distinct.
Direct links and explicitly saved source records are retained. Café/bakery filters
are off by default, but are included in group toggles, saves and shared views.
Refresh only these destinations without changing existing snapshots:

```powershell
npm run places:refresh -- --outings-only
```

`--outings-only --osm-input` accepts a complete raw `OUTING_OSM_QUERY` response,
including its OSM database timestamp. Missing/partial categories fail before
publication. The full refresh includes outings too. Listings are not live hours,
equipment status, seasonal splash-pad operation, water potability, court availability,
public access or accessibility guarantees. Garden admission, bookings and café
customer restrictions can apply; verify arrangements and entrances before traveling.

## Park amenities and walking-layer refresh

Refresh just the new amenities or just these walking/tree layers:

```powershell
npm run places:refresh -- --amenities-only
npm run places:refresh -- --walking-trees-only
```

The full refresh includes both. Queries validate every matching ID in batches of
at most 200, with at most four concurrent requests. Only relevant classification
fields are requested: no donor, contact, maintenance-user or demographic priority
attributes are published. Content-addressed tile names keep cached indexes tied
to the correct generation; older tiles are retained by refresh for in-flight
indexes and can be pruned deliberately after reviewing their references.

## Spatial tiles and geometry

The large inventories are partitioned into content-addressed 0.025-degree
spatial tiles. Only intersecting tiles load when enabled at the required zoom;
the browser does not download the full tree or sidewalk inventory. Whole
sidewalk polygons, including holes, are retained in a tile whose recorded bounds
cover the complete geometry. Display geometry is source-generalized at
0.000002 degrees (roughly 0.2 m); tiny assets that collapse under generalization
are re-queried without it. Client tile caching is bounded. Load/draw failures have
independent retry controls; a retained older area is explicitly identified.

## Refresh review and failure behavior

Refresh manually when maintaining the catalog (monthly is a reasonable starting
cadence), and review names, counts, additions/removals, source dates, and arrival
points before publishing. Retrieval dates are not source update dates. Overpass
mirrors can be stale or rate-limited; the UI exposes the OSM database timestamp
separately. There are no automated retries or scheduled jobs. On source errors,
invalid data or incomplete pages, the command fails without publishing partial
snapshots; previous files remain usable.

## Overpass errors and raw input

If Overpass returns 429 or is unavailable, wait or set `OVERPASS_URL` to a trusted
public Overpass interpreter. To import an already downloaded **complete raw response
to the same query**, retain its `osm3s.timestamp_osm_base` and use:

```powershell
npm run places:refresh -- --osm-input "C:\path\to\portland-overpass-response.json"
```

Without `--culture-only` or `--outings-only`, `--osm-input` supplies the food-pod query;
City, Metro, cultural and outing data are still fetched and validated in that
full-refresh mode. `npm run test:places-data`
checks ingestion and safe replacement without querying external services.
The checked-in initial food-pod response is from July 2026; it is not represented
as a current November directory. Cultural snapshots carry their own retrieval
and OSM source dates.

## Snapshot locations, attribution, and licenses

Snapshots live separately under `public\data\places\parks.json` (City of Portland,
PDDL default terms), `food-cart-pods.json` (OpenStreetMap contributors, ODbL),
and `community-centers.json` / `libraries.json` (Metro, RLIS Open Database End User
License Agreement). Each retains its source, license, retrieval date and limitations;
`neighborhoods.json` is a separate City of Portland polygon snapshot under the
same City PDDL default terms.
`community-gardens.json`, `farmers-markets.json`, `public-restrooms.json` and
`heritage-trees.json`, plus `grocery-stores.json`, `reuse-repair.json`,
`csa-pickups.json`, and `bicycle-parking.json`, also retain their City bureau
attribution and PDDL default terms.
OSM and Metro snapshots also retain the source database/data-edit date. See
`public\data\places\NOTICE.txt`. These data licenses are separate from the app code's
MIT license. Recheck upstream metadata/terms before future redistribution.

See the checked-in [data notice](../public/data/places/NOTICE.txt) for attribution and [development](development.md) for the existing ingestion tests.
