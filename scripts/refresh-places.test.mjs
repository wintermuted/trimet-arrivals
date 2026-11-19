import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import os from "node:os";
import path from "node:path";
import {
  fetchCityPlaces, fetchMetroPlaces, fetchNeighborhoods, fetchParks, normalizeCityPlaces, normalizeMetroPlaces, normalizeNeighborhoods,
  normalizeParks, normalizePods, polygonPoint, writeSnapshots, normalizeLineOverlay, fetchLineOverlay,
  normalizeCulturePlaces, buildCultureSnapshots, fetchCultureSnapshots, CULTURE_OSM_QUERY, CULTURE_SOURCES,
  normalizeOutingPlaces, buildOutingSnapshots, fetchOutingSnapshots, OUTING_OSM_QUERY, OUTING_SOURCES
} from "./refresh-places.mjs";
import { fetchArcgisFeatures } from "./arcgis.mjs";
import { buildContextSnapshots, CONTEXT_SOURCES, fetchContextFeatures } from "./context-overlays.mjs";

const geometry = { type: "Polygon", coordinates: [[[-122.7, 45.5], [-122.6, 45.5], [-122.6, 45.6], [-122.7, 45.5]]] };
const park = id => ({ properties: { OBJECTID: id, PROPERTYID: id, NAME: `Park ${id}` }, geometry });
const pod = (id, name, tags = {}) => ({ type: "node", id, lon: -122.67, lat: 45.52, tags: { amenity: "food_court", name, ...tags } });
const cultural = (id, category, extra = {}) => ({
  type: "node", id, lon: -122.67, lat: 45.52,
  tags: { [CULTURE_SOURCES[category].key]: CULTURE_SOURCES[category].value, name: `Example ${category}`, ...extra }
});
const outing = (id, category, extra = {}) => ({
  type: "node", id, lon: -122.67, lat: 45.52,
  tags: { ...Object.fromEntries(Object.entries(OUTING_SOURCES[category].selectors[0])
    .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])), name: `Example ${category}`, ...extra }
});
const amenity = (id, Asset = "Drinking Fountain", Status = "Active") => ({
  type: "Feature", geometry: { type: "Point", coordinates: [-122.67, 45.52] },
  properties: { OBJECTID: id, Park: "Example Park", Asset, Status, Style: `${Asset}: Example`, Adopt_Donor: "DO NOT PUBLISH" }
});
const contextPoint = id => ({ type: "Feature", geometry: { type: "Point", coordinates: [-122.67, 45.52] },
  properties: { OBJECTID: id, SPECIES: "Acer", StreetName: "Example Street", CrossStreet: "Other Street",
    EquityPriorityScore: "DO NOT PUBLISH" } });

test("keeps only active park amenities and their classifications without publishing donor fields", () => {
  for (const [category, asset] of [["drinking-fountain", "Drinking Fountain"], ["picnic-seating", "Bench"], ["park-artwork", "Art Work"]]) {
    const records = normalizeCityPlaces([amenity(1, asset), amenity(2, asset, "Removed"), amenity(3, asset, "Closed")], category);
    assert.equal(records.length, 1);
    assert.equal(records[0].id, `portland:${category}:1`);
    assert.equal(records[0].amenityType, asset);
    assert.ok(!JSON.stringify(records).includes("DO NOT PUBLISH"));
    assert.throws(() => normalizeCityPlaces([amenity(1, asset), amenity(1, asset)], category), /duplicate/);
    assert.throws(() => normalizeCityPlaces([amenity(1, asset, "Unknown")], category), /status/);
    assert.throws(() => normalizeCityPlaces([amenity(1, "Unrecognized")], category), /classification/);
  }
  assert.equal(normalizeCityPlaces([amenity(1, "Bench"), amenity(2, "Picnic Table")], "picnic-seating").length, 2);
});

test("fetches complete bounded ArcGIS batches and rejects duplicated, truncated or invalid ID inventories", async () => {
  const ids = Array.from({ length: 405 }, (_, i) => i + 1);
  let active = 0, maximum = 0;
  const request = async url => {
    const p = new URL(url).searchParams;
    if (p.has("returnIdsOnly")) return { objectIds: ids };
    assert.equal(p.get("maxAllowableOffset"), "0.000002");
    const wanted = p.get("objectIds").split(",").map(Number);
    assert.ok(wanted.length <= 200);
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    return { features: wanted.map(contextPoint) };
  };
  assert.equal((await fetchArcgisFeatures(CONTEXT_SOURCES.sidewalks, request)).length, 405);
  assert.ok(maximum <= 4);
  for (const objectIds of [[1, 1], [0], [1.5], []]) {
    await assert.rejects(fetchArcgisFeatures(CONTEXT_SOURCES.crossings, async () => ({ objectIds })), /IDs/);
  }
  await assert.rejects(fetchArcgisFeatures(CONTEXT_SOURCES.crossings, async url =>
    url.includes("returnIdsOnly") ? { objectIds: [1, 2] } : { features: [contextPoint(1), contextPoint(1)] }), /duplicated/);
});

test("partitions complete context inventories into bounded content-addressed tiles without flattening sidewalk holes", () => {
  const points = [contextPoint(1), { ...contextPoint(2), geometry: { type: "Point", coordinates: [-122.4, 45.6] } }];
  const snapshots = buildContextSnapshots(points, "street-trees");
  assert.equal(snapshots["street-trees.json"].count, 2);
  assert.equal(snapshots["street-trees.json"].tiles.length, 2);
  for (const tile of snapshots["street-trees.json"].tiles) {
    assert.match(tile.file, /^street-trees-\d+-\d+-[a-f0-9]{12}\.json$/);
    assert.equal(snapshots[tile.file].features.length, tile.count);
    assert.ok(!JSON.stringify(snapshots[tile.file]).includes("DO NOT PUBLISH"));
  }
  const sidewalk = { ...contextPoint(1), geometry: { ...geometry, coordinates: [geometry.coordinates[0], geometry.coordinates[0]] } };
  const polygons = buildContextSnapshots([sidewalk], "sidewalks");
  assert.deepEqual(polygons[polygons["sidewalks.json"].tiles[0].file].features[0].geometry, sidewalk.geometry);
  assert.throws(() => buildContextSnapshots([contextPoint(1)], "sidewalks"), /geometry/);
  assert.throws(() => buildContextSnapshots([contextPoint(1), contextPoint(1)], "crossings"), /ID/);
});
test("retains tiny sidewalk assets when source display generalization collapses their polygon", async () => {
  const original = { ...contextPoint(1), geometry };
  const request = async url => {
    const params = new URL(url).searchParams;
    if (params.has("returnIdsOnly")) return { objectIds: [1] };
    return { features: [{ ...original, geometry: params.has("maxAllowableOffset") ?
      { type: "Polygon", coordinates: [] } : geometry }] };
  };
  const features = await fetchContextFeatures("sidewalks", request);
  assert.deepEqual(features, [original]);
  assert.equal(buildContextSnapshots(features, "sidewalks")["sidewalks.json"].count, 1);
});

test("retrieves all city records beyond the service page limit and rejects incomplete pages", async () => {
  const ids = Array.from({ length: 205 }, (_, i) => i + 1);
  const request = async url => {
    const params = new URL(url).searchParams;
    return params.has("returnIdsOnly") ? { objectIds: ids } :
      { features: params.get("objectIds").split(",").map(Number).map(park) };
  };
  assert.equal((await fetchParks(request)).length, 205);
  await assert.rejects(fetchParks(async url => url.includes("returnIdsOnly") ? { objectIds: [1, 2] } : { features: [park(1)] }), /omitted/);
});

test("deduplicates park taxlots and never treats polygon display points as entrances", () => {
  assert.equal(normalizeParks([park(1), park(1)]).length, 1);
  assert.equal(normalizeParks([park(1)])[0].arrival, "approximate");
  assert.throws(() => normalizeParks([park(1), { ...park(2), geometry: null }]), /geometry/);
  assert.throws(() => normalizeParks([]), /empty/);
  assert.ok(polygonPoint(geometry).every(Number.isFinite));
});

test("excludes generic indoor food courts and closed/private vendors, deduplicating pod representations", () => {
  const places = normalizePods([
    pod(1, "Mall Food Court", { indoor: "yes" }),
    pod(2, "Library Cafe"),
    pod(3, "Closed Food Carts", { disused: "yes" }),
    pod(4, "Private Food Carts", { access: "private" }),
    pod(5, "Test Food Carts"),
    { ...pod(6, "Test Food Carts"), type: "way", center: { lon: -122.67, lat: 45.52 } },
    pod(7, "Prost Marketplace"),
  ]);
  assert.equal(places.length, 2);
  assert.equal(places.find(place => place.name === "Test Food Carts").id, "osm:way:6");
  assert.throws(() => normalizePods([pod(1, "Generic")]), /No food-cart pods/);
});

test("classifies cultural venues, excludes inactive/private entries and merges duplicate footprint/node representations", () => {
  const venues = Object.keys(CULTURE_SOURCES).map((category, i) => cultural(i + 1, category));
  const places = normalizeCulturePlaces([
    ...venues,
    { ...cultural(20, "museum"), type: "way", center: { lon: -122.67, lat: 45.52 },
      tags: { tourism: "museum", name: "Example museum", website: "javascript:alert(1)" } },
    cultural(30, "museum", { name: "Private", access: "private" }),
    cultural(31, "art-gallery", { name: "Closed gallery", "disused:tourism": "gallery" }),
    cultural(32, "theatre", { name: "Closed theatre", closed: "yes" }),
    cultural(33, "arts-centre", { name: "Future centre", "proposed:amenity": "arts_centre" }),
    cultural(34, "museum", { name: "" }),
    cultural(35, "museum", { name: "Dual classification", amenity: "arts_centre" }),
    { ...cultural(36, "museum"), lon: -122.6 }
  ]);
  assert.equal(places.length, 6);
  assert.deepEqual(places.filter(place => place.name === "Example museum").map(place => place.id),
    ["osm:museum:node:36", "osm:museum:way:20"]);
  assert.equal(places.find(place => place.id === "osm:museum:way:20").website, undefined);
  assert.equal(places.find(place => place.name === "Dual classification").category, "museum");
  assert.equal(places.find(place => place.category === "art-gallery").sourceUrl, "https://www.openstreetmap.org/node/2");
  assert.ok(places.every(place => place.arrival === "approximate"));
  assert.throws(() => normalizeCulturePlaces([cultural(0, "museum")]), /identity/);
  assert.throws(() => normalizeCulturePlaces([cultural(1, "museum"), cultural(1, "museum")]), /Duplicate/);
  assert.throws(() => normalizeCulturePlaces([{ ...cultural(1, "museum"), lon: -123.5 }]), /point/);
});

test("builds complete licensed cultural snapshots and rejects partial, empty and undated Overpass responses", async () => {
  const osm = { osm3s: { timestamp_osm_base: "2026-11-19T12:00:00Z" },
    elements: Object.keys(CULTURE_SOURCES).map((category, i) => cultural(i + 1, category, {
      website: "https://example.org/", "addr:housenumber": "100", "addr:street": "SW Example Street"
    })) };
  const snapshots = await fetchCultureSnapshots(async (_url, options) => {
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("data"), CULTURE_OSM_QUERY);
    assert.match(CULTURE_OSM_QUERY, /"wikidata"="Q6106"/);
    return osm;
  });
  assert.deepEqual(Object.keys(snapshots).sort(), Object.values(CULTURE_SOURCES).map(source => source.file).sort());
  for (const snapshot of Object.values(snapshots)) {
    assert.equal(snapshot.license, "ODbL-1.0");
    assert.equal(snapshot.sourceUpdatedAt, osm.osm3s.timestamp_osm_base);
    assert.equal(snapshot.places.length, 1);
    assert.equal(snapshot.places[0].address, "100 SW Example Street");
    assert.equal(snapshot.places[0].website, "https://example.org/");
  }
  assert.throws(() => buildCultureSnapshots({ ...osm, remark: "timeout" }), /incomplete/);
  assert.throws(() => buildCultureSnapshots({ ...osm, osm3s: {} }), /timestamp/);
  assert.throws(() => buildCultureSnapshots({ ...osm, elements: osm.elements.slice(1) }), /No museum/);
  assert.throws(() => buildCultureSnapshots({ ...osm, elements: [] }), /No museum/);
});

test("classifies all outing sources with deterministic splash/art/skate precedence and no personal contact fields", () => {
  const places = normalizeOutingPlaces([
    ...Object.keys(OUTING_SOURCES).map((category, i) => outing(i + 1, category, {
      website: "https://example.org/", phone: "DO NOT PUBLISH", email: "DO NOT PUBLISH", description: "DO NOT PUBLISH"
    })),
    outing(100, "splash-pad", { leisure: "playground" }),
    outing(101, "historic-site", { tourism: "artwork" }),
    { ...outing(102, "skatepark"), tags: { leisure: "pitch", sport: "skateboard", name: "Skate pitch" } },
    outing(103, "sports-court", { sport: "tennis;pickleball", name: "Shared court" }),
    { ...outing(104, "viewpoint"), tags: { man_made: "tower", "tower:type": "observation", name: "Observation tower" } },
    outing(105, "public-garden", { access: undefined, "garden:type": "botanical", name: "Botanical garden" })
  ]);
  assert.equal(places.length, Object.keys(OUTING_SOURCES).length + 6);
  assert.equal(places.find(place => place.id.endsWith(":100")).category, "splash-pad");
  assert.equal(places.find(place => place.id.endsWith(":101")).category, "historic-site");
  assert.equal(places.find(place => place.id.endsWith(":102")).category, "skatepark");
  assert.equal(places.find(place => place.id.endsWith(":103")).siteType, "tennis, pickleball court");
  assert.equal(places.find(place => place.id.endsWith(":104")).category, "viewpoint");
  assert.ok(places.every(place => place.website === undefined || place.website === "https://example.org/"));
  assert.ok(!JSON.stringify(places).includes("DO NOT PUBLISH"));
  for (const [i, category] of Object.keys(OUTING_SOURCES).entries()) {
    assert.ok(places.some(place => place.id === `osm:${category}:node:${i + 1}`));
  }
});

test("excludes restricted/inactive outings, private gardens, non-court fields and nonspecific unnamed venues", () => {
  assert.deepEqual(normalizeOutingPlaces([
    outing(1, "playground", { access: "private" }), outing(2, "cafe", { access: "no" }),
    outing(3, "sports-court", { access: "permit" }), outing(4, "skatepark", { "disused:leisure": "pitch" }),
    outing(5, "bakery", { "abandoned:shop": "bakery" }), outing(6, "public-art", { demolished: "yes" }),
    outing(7, "nature-reserve", { "proposed:leisure": "nature_reserve" }),
    outing(8, "sports-court", { sport: "soccer" }), outing(9, "public-garden", { access: undefined }),
    outing(10, "public-garden", { "garden:type": "community" }),
    outing(11, "public-garden", { "garden:type": "residential" }),
    outing(12, "cafe", { name: "" }), outing(13, "historic-site", { name: "" }),
    outing(14, "viewpoint", { name: "" })
  ]), []);
  const unnamed = normalizeOutingPlaces(["playground", "splash-pad", "sports-court", "skatepark", "public-art"]
    .map((category, i) => outing(i + 1, category, { name: "" })));
  assert.equal(unnamed.length, 5);
  assert.ok(unnamed.every(place => place.name.includes("(OSM node ")));
  assert.throws(() => normalizeOutingPlaces([{ ...outing(1, "cafe"), type: "building" }]), /identity/);
  assert.throws(() => normalizeOutingPlaces([{ ...outing(1, "cafe"), lon: -120 }]), /point/);
});

test("merges only equivalent node/footprint outings without collapsing adjacent courts, branches or unnamed assets", () => {
  const places = normalizeOutingPlaces([
    { ...outing(1, "cafe"), type: "way" },
    outing(2, "cafe", { website: "https://example.org/" }),
    outing(3, "cafe", { name: "Other cafe", "addr:housenumber": "100", "addr:street": "SW Main Street" }),
    { ...outing(4, "cafe", { name: "Other cafe", "addr:housenumber": "102", "addr:street": "SW Main Street" }), type: "way" },
    outing(5, "sports-court"), outing(6, "sports-court"),
    outing(7, "playground", { name: "" }), { ...outing(8, "playground", { name: "" }), type: "way" }
  ]);
  assert.equal(places.length, 7);
  assert.equal(places.find(place => place.name === "Example cafe").id, "osm:cafe:way:1");
  assert.equal(places.find(place => place.name === "Example cafe").website, "https://example.org/");
  assert.equal(places.filter(place => place.name === "Other cafe").length, 2);
  assert.equal(places.filter(place => place.category === "sports-court").length, 2);
  assert.equal(places.filter(place => place.category === "playground").length, 2);
});

test("fetches complete separately licensed outing snapshots and rejects partial or missing categories", async () => {
  const osm = { osm3s: { timestamp_osm_base: "2026-11-19T12:00:00Z" },
    elements: Object.keys(OUTING_SOURCES).map((category, i) => outing(i + 1, category)) };
  const snapshots = await fetchOutingSnapshots(async (_url, options) => {
    assert.equal(options.body.get("data"), OUTING_OSM_QUERY);
    assert.match(OUTING_OSM_QUERY, /"wikidata"="Q6106"/);
    return osm;
  });
  assert.equal(Object.keys(snapshots).length, Object.keys(OUTING_SOURCES).length);
  assert.ok(Object.values(snapshots).every(snapshot => snapshot.license === "ODbL-1.0" &&
    snapshot.sourceUpdatedAt === osm.osm3s.timestamp_osm_base && snapshot.places.length === 1));
  assert.throws(() => buildOutingSnapshots({ ...osm, remark: "runtime timeout" }), /incomplete/);
  assert.throws(() => buildOutingSnapshots({ ...osm, osm3s: {} }), /timestamp/);
  assert.throws(() => buildOutingSnapshots({ ...osm, elements: osm.elements.slice(1) }), /No viewpoint/);
});

test("writes complete separate snapshots and leaves no staging files", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "places-test-"));
  try {
    await writeSnapshots(directory, { "parks.json": { places: [park(1)] }, "pods.json": { places: [] } });
    assert.equal(JSON.parse(await readFile(path.join(directory, "parks.json"), "utf8")).places.length, 1);
    await assert.rejects(readFile(path.join(directory, "parks.json.tmp")), { code: "ENOENT" });
    const circular = {}; circular.self = circular;
    await assert.rejects(writeSnapshots(directory, { "parks.json": { places: [] }, "pods.json": circular }));
    assert.equal(JSON.parse(await readFile(path.join(directory, "parks.json"), "utf8")).places.length, 1);
  } finally {
    await rm(directory, { recursive: true });
  }
});

const metro = (id, name, extra = {}) => ({ type: "Feature", geometry: { type: "Point", coordinates: [-122.67, 45.52] },
  properties: { FID: id, SITEID: id, NAME: name, CITY: "Portland", STATE: "OR", ...extra } });

test("keeps Portland-addressed public facilities, stable category IDs and reviewed library relocations", () => {
  const centers = normalizeMetroPlaces([metro(1, "Community Center"), metro(2, "Elsewhere", { CITY: "Gresham" })], "community-center");
  assert.equal(centers.length, 1);
  assert.equal(centers[0].id, "metro:community-center:1");
  const libraries = normalizeMetroPlaces([
    metro(1, "Central Library"), metro(2, "Oregon College of Art & Craft"), metro(3, "Hillsdale Library"),
    metro(4, "Albina Library", { ADDRESS: "216 NE Knott St" }),
    metro(5, "Northwest Library", { ADDRESS: "2300 NW Thurman St" })
  ], "library");
  assert.equal(libraries.length, 3);
  assert.equal(libraries.find(place => place.name === "Central Library").id, "metro:library:central-library");
  assert.equal(libraries.find(place => place.name === "Albina Library").address, "205 NE Russell Street");
  assert.deepEqual(libraries.find(place => place.name === "Northwest Library").coordinates, [-122.6960768, 45.5325963]);
  assert.throws(() => normalizeMetroPlaces([{ ...metro(1, "Bad Library"), geometry: null }], "library"), /Invalid Metro point/);
  assert.throws(() => normalizeMetroPlaces([], "library"), /No Portland/);
  assert.throws(() => normalizeMetroPlaces([metro(1, "Center"), metro(1, "Duplicate")], "community-center"), /Duplicate/);
});

test("rejects incomplete Metro pages and uses data edits rather than schema edit dates", async () => {
  const request = async url => {
    const params = new URL(url).searchParams;
    if (!url.includes("/query")) return { objectIdField: "FID", editingInfo: { dataLastEditDate: 1660000000000, lastEditDate: 1780000000000 } };
    return params.has("returnIdsOnly") ? { objectIds: [1, 2] } : { features: [metro(1, "Central Library"), metro(2, "Kenton Library")] };
  };
  const result = await fetchMetroPlaces("library", request);
  assert.equal(result.places.length, 2);
  assert.equal(result.sourceUpdatedAt, new Date(1660000000000).toISOString());
  await assert.rejects(fetchMetroPlaces("library", async url => url.includes("objectIds=") ? { features: [metro(1, "Central Library")] } : request(url)), /omitted/);
});

const neighborhood = id => ({ type: "Feature", geometry,
  properties: { OBJECTID: id, ID: id, NAME: "EXAMPLE", MAPLABEL: "Example", SHARED: "N" } });

test("preserves neighborhood polygons, holes, multipolygons and shared boundary areas", () => {
  const withHole = { type: "Polygon", coordinates: [...geometry.coordinates, geometry.coordinates[0]] };
  const input = [
    { ...neighborhood(1), geometry: withHole },
    { ...neighborhood(2), geometry: { type: "MultiPolygon", coordinates: [geometry.coordinates, geometry.coordinates] },
      properties: { ...neighborhood(2).properties, SHARED: "Y", MAPLABEL: "Example/Neighbor" } }
  ];
  const result = normalizeNeighborhoods(input);
  assert.deepEqual(result[0].geometry, withHole);
  assert.deepEqual(result[1].geometry, input[1].geometry);
  assert.equal(result[1].properties.shared, true);
  assert.equal(result[1].properties.areaId, 2);
  assert.equal(result[1].properties.name, "Example/Neighbor");
  assert.throws(() => normalizeNeighborhoods([neighborhood(1), neighborhood(1)]), /duplicate/);
  assert.throws(() => normalizeNeighborhoods([{ ...neighborhood(1), geometry: { type: "Point", coordinates: [-122.67, 45.52] } }]), /polygon/);
  assert.throws(() => normalizeNeighborhoods([{ ...neighborhood(1), geometry: {
    type: "Polygon", coordinates: [geometry.coordinates[0].slice(0, -1)]
  } }]), /polygon/);
});

test("retrieves all neighborhood areas and rejects truncated or incomplete source responses", async () => {
  const ids = Array.from({ length: 125 }, (_, i) => i + 1);
  let pages = 0;
  const request = async url => {
    const params = new URL(url).searchParams;
    if (params.has("returnIdsOnly")) return { objectIds: ids };
    pages++;
    assert.equal(params.get("outSR"), "4326");
    return { features: params.get("objectIds").split(",").map(Number).map(neighborhood) };
  };
  assert.equal((await fetchNeighborhoods(request)).features.length, ids.length);
  assert.equal(pages, 2);
  await assert.rejects(fetchNeighborhoods(async url => url.includes("returnIdsOnly")
    ? { objectIds: [1, 2] } : { features: [neighborhood(1)] }), /omitted/);
  await assert.rejects(fetchNeighborhoods(async url => url.includes("returnIdsOnly")
    ? { objectIds: [1] } : { features: [neighborhood(1)], exceededTransferLimit: true }), /Incomplete/);
});

const cityGarden = id => ({ type: "Feature", geometry,
  properties: { OBJECTID: id, GlobalID: `{37D4EC75-92B5-47DD-8B36-${String(id).padStart(12, "0")}}`,
    PropertyID: 89, Site_Name: `Garden ${id}`, Status: "Active" } });
const cityMarket = id => ({ type: "Feature", geometry: { type: "Point", coordinates: [-122.67, 45.52] },
  properties: { OBJECTID: id, Market: `Market ${id}`, status: "Active", Location: "100 Main Street",
    Day: "Saturday", Open_Dates: "May - October", Open_Times: "9 a.m. - 1 p.m.", Website: "https://example.org" } });
const cityRestroom = id => ({ type: "Feature", geometry: { type: "Point", coordinates: [-122.67, 45.52] },
  properties: { OBJECTID: id, Property: "Example Park", Building: "Restroom A", Room: `Room ${id}`, Status: "1", ADA: "Yes" } });
const cityTree = id => ({ type: "Feature", geometry: { type: "Point", coordinates: [-122.67, 45.52] },
  properties: { OBJECTID: id, TREEID: id + 50, STATUS: "Heritage", COMMON: "Oregon white oak", SCIENTIFIC: "Quercus garryana",
    SITE_ADDRESS: "100 Main Street", Ownership: "Private, Front Yard", Delist_Date: null, Owner_name: "MUST NOT BE PUBLISHED" } });
const cityGrocery = id => ({ ...cityMarket(id),
  properties: { OBJECTID: id, NAME: `Grocer ${id}`, ADDRESS: "100 Main Street", STATUS: "Existing" } });
const cityReuse = id => ({ ...cityMarket(id),
  properties: { OBJECTID: id, Organization: `Reuse ${id}`, Address: "100 Main Street", Website: "www.example.org",
    Service: "Lending Library", Additional_service: "Repair Shop", What_they_offer_accept: "Tools", Phone: "NOT FOR PUBLICATION" } });
const cityCsa = id => ({ ...cityMarket(id),
  properties: { OBJECTID: id, Farm_Name: `Farm ${id}`, Location: "100 Main Street", Status: "Active",
    UniqueID: "shared-farm-id", Season: "June - November", Main_Products: "vegetables", Website: "example.org", email: "NOT FOR PUBLICATION" } });
const cityBike = id => ({ ...cityMarket(id),
  properties: { OBJECTID: id, AssetID: `5220-${id}`, NumSpaces: 2, Covered: "Y" } });
const trail = id => ({ type: "Feature", geometry: { type: "LineString", coordinates: [[-122.7, 45.5], [-122.69, 45.51]] },
  properties: { OBJECTID: id, Local_Name: "Example trail", TYPE: "Trail/Path (3-5 ft.)", STATUS: "existing", SURFACE: "soil" } });
const network = id => ({ ...trail(id), properties: { OBJECTID: id, SegmentName: "Example bikeway",
  Status: "ACTIVE", Facility: "PBL", YearRetired: null } });
const recommended = id => ({ ...trail(id), properties: { OBJECTID: id, StreetName: "Example route", ConnectionType: "NG" } });

test("keeps existing trails and active bike facilities, not water/maintenance/closed trails or future development", () => {
  const trails = normalizeLineOverlay([trail(1), { ...trail(2), geometry: null },
    ...["proposed", "informal", "closed"].map((STATUS, i) => ({ ...trail(i + 3), properties: { ...trail(i + 3).properties, STATUS } })),
    ...["water trail", "Maintenance Road", "CAT Road (retired)"].map((TYPE, i) => ({ ...trail(i + 6), properties: { ...trail(i + 6).properties, TYPE } }))], "park-trails");
  assert.equal(trails.length, 1);
  assert.equal(trails[0].id, "portland:park-trails:1");
  const active = normalizeLineOverlay([network(1),
    ...["PLANNED", "RECOMM", "RETIRED", "NONE"].map((Status, i) => ({ ...network(i + 2), properties: { ...network(i + 2).properties, Status } })),
    { ...network(6), properties: { ...network(6).properties, YearRetired: 2020 } }], "bicycle-network");
  assert.equal(active.length, 1);
  assert.equal(active[0].properties.detail, "PBL");
  assert.throws(() => normalizeLineOverlay([{ ...network(1), properties: { ...network(1).properties, Status: "NEW" } }], "bicycle-network"), /status/);
});

test("preserves line/multiline geometry and marks difficult, traffic and unclassified recommended connections for caution", () => {
  const fixtures = ["NG", "BL-DC", "BL_VHT", "SR_MT", null].map((ConnectionType, i) =>
    ({ ...recommended(i + 1), properties: { ...recommended(i + 1).properties, ConnectionType } }));
  fixtures[0].geometry = { type: "MultiLineString", coordinates: [trail(1).geometry.coordinates, trail(2).geometry.coordinates] };
  const result = normalizeLineOverlay(fixtures, "recommended-bike-routes");
  assert.deepEqual(result[0].geometry, fixtures[0].geometry);
  assert.deepEqual(result.map(f => f.properties.kind), ["standard", "caution", "caution", "caution", "caution"]);
  assert.throws(() => normalizeLineOverlay([recommended(1), recommended(1)], "recommended-bike-routes"), /duplicate/);
  assert.throws(() => normalizeLineOverlay([{ ...recommended(1), geometry }], "recommended-bike-routes"), /geometry/);
  assert.throws(() => normalizeLineOverlay([{ ...recommended(1), properties: { ...recommended(1).properties, ConnectionType: "NEW" } }], "recommended-bike-routes"), /connection/);
});

test("paginates complete line overlays, queries only active non-retired bike infrastructure and rejects truncated/duplicate data", async () => {
  for (const [category, fixture] of [["park-trails", trail], ["bicycle-network", network], ["recommended-bike-routes", recommended]]) {
    const ids = Array.from({ length: 205 }, (_, i) => i + 1);
    const data = await fetchLineOverlay(category, async url => {
      const params = new URL(url).searchParams;
      if (params.has("returnIdsOnly")) {
        if (category === "bicycle-network") assert.equal(params.get("where"), "Status = 'ACTIVE' AND YearRetired IS NULL");
        return { objectIds: ids };
      }
      assert.equal(params.get("geometryPrecision"), "6");
      return { features: params.get("objectIds").split(",").map(Number).map(fixture) };
    });
    assert.equal(data.features.length, 205);
    await assert.rejects(fetchLineOverlay(category, async url => url.includes("returnIdsOnly")
      ? { objectIds: [1, 2] } : { features: [fixture(1)] }), /omitted/);
    await assert.rejects(fetchLineOverlay(category, async url => url.includes("returnIdsOnly")
      ? { objectIds: [1] } : { features: [fixture(1)], exceededTransferLimit: true }), /Incomplete/);
    await assert.rejects(fetchLineOverlay(category, async url => url.includes("returnIdsOnly")
      ? { objectIds: [1, 2] } : { features: [fixture(1), fixture(1)] }), /duplicated/);
  }
});

test("keeps existing groceries and separate addressed CSA offerings, excluding closures and vague pickup locations", () => {
  const groceries = normalizeCityPlaces([cityGrocery(1),
    { ...cityGrocery(2), properties: { ...cityGrocery(2).properties, STATUS: "Closed" } }], "grocery-store");
  assert.equal(groceries.length, 1);
  assert.equal(groceries[0].id, "portland:grocery:1");
  const csa = normalizeCityPlaces([cityCsa(1), cityCsa(2),
    { ...cityCsa(3), properties: { ...cityCsa(3).properties, Status: "Inactive" } },
    { ...cityCsa(4), properties: { ...cityCsa(4).properties, Location: "Portland" } },
    { ...cityCsa(5), properties: { ...cityCsa(5).properties, Location: "NE Wygant St." } }], "csa-pickup");
  assert.equal(csa.length, 2);
  assert.equal(csa[0].id, "portland:csa:1");
  assert.equal(csa[0].pickupSeason, "June - November");
  assert.equal(csa[0].pickupProducts, "vegetables");
  assert.equal(csa[0].website, "https://example.org");
  assert.ok(!JSON.stringify(csa).includes("NOT FOR PUBLICATION"));
  for (const [category, fixture, key] of [["grocery-store", cityGrocery, "STATUS"], ["csa-pickup", cityCsa, "Status"]]) {
    assert.throws(() => normalizeCityPlaces([{ ...fixture(1), properties: { ...fixture(1).properties, [key]: "Unknown" } }], category), /status/);
  }
});

test("retains safe reuse service/item metadata and stable individual bike assets without implying availability", () => {
  const reuse = normalizeCityPlaces([cityReuse(1),
    { ...cityReuse(2), geometry: { type: "Point", coordinates: [] } }], "reuse-repair");
  assert.equal(reuse.length, 1);
  assert.equal(reuse[0].reuseServices, "Lending Library, Repair Shop");
  assert.equal(reuse[0].reuseItems, "Tools");
  assert.equal(reuse[0].website, "https://www.example.org");
  assert.ok(!JSON.stringify(reuse).includes("NOT FOR PUBLICATION"));
  const bikes = normalizeCityPlaces([cityBike(1), { ...cityBike(2),
    properties: { ...cityBike(2).properties, NumSpaces: null, Covered: " " } }], "bicycle-parking");
  assert.equal(bikes.length, 2);
  assert.equal(bikes[0].id, "portland:bike:5220-1");
  assert.equal(bikes[0].bikeSpaces, 2);
  assert.equal(bikes[0].bikeCovered, "yes");
  assert.equal(bikes[1].bikeCovered, "unknown");
  assert.equal(bikes[1].bikeSpaces, undefined);
  assert.equal(bikes[0].arrival, "approximate");
  assert.throws(() => normalizeCityPlaces([{ ...cityBike(1),
    properties: { ...cityBike(1).properties, NumSpaces: -1 } }], "bicycle-parking"), /capacity/);
});

test("rejects malformed or duplicate everyday destinations and explicitly omits points outside map coverage", () => {
  for (const [category, fixture] of [["grocery-store", cityGrocery], ["reuse-repair", cityReuse],
    ["csa-pickup", cityCsa], ["bicycle-parking", cityBike]]) {
    assert.throws(() => normalizeCityPlaces([fixture(1), fixture(1)], category), /Duplicate/);
    assert.throws(() => normalizeCityPlaces([{ ...fixture(1), geometry: null }], category), /geometry/);
    assert.throws(() => normalizeCityPlaces([{ ...fixture(1), properties: {} }], category));
    assert.equal(normalizeCityPlaces([fixture(1), { ...fixture(2),
      geometry: { type: "Point", coordinates: [-123.1, 45.5] } }], category).length, 1);
  }
});

test("keeps open-listed and unknown restroom rooms distinct without implying live hours or accessibility", () => {
  const unknown = { ...cityRestroom(2), properties: { ...cityRestroom(2).properties, Status: "2", ADA: null } };
  const closed = { ...cityRestroom(3), properties: { ...cityRestroom(3).properties, Status: "3" } };
  const places = normalizeCityPlaces([cityRestroom(1), unknown, closed], "public-restroom");
  assert.equal(places.length, 2);
  assert.equal(places[0].id, "portland:restroom:1");
  assert.equal(places[0].name, "Example Park - Restroom A - Room 1");
  assert.equal(places[0].restroomStatus, "listed-24-7");
  assert.equal(places[1].restroomStatus, "unknown");
  assert.equal(places[1].restroomAda, "unknown");
  assert.equal(normalizeCityPlaces([cityRestroom(1), { ...cityRestroom(2), geometry: { type: "Point", coordinates: [] } }], "public-restroom").length, 1);
  assert.throws(() => normalizeCityPlaces([cityRestroom(1), cityRestroom(1)], "public-restroom"), /Duplicate/);
  assert.throws(() => normalizeCityPlaces([{ ...cityRestroom(1), properties: { ...cityRestroom(1).properties, Status: null } }], "public-restroom"), /status/);
  assert.throws(() => normalizeCityPlaces([{ ...cityRestroom(1), geometry: null }], "public-restroom"), /geometry/);
});

test("keeps heritage tree numbers and species, excluding removed/merit/delisted trees and owner contact fields", () => {
  const places = normalizeCityPlaces([cityTree(1),
    { ...cityTree(2), properties: { ...cityTree(2).properties, STATUS: "Removed" } },
    { ...cityTree(3), properties: { ...cityTree(3).properties, STATUS: "Merit" } },
    { ...cityTree(4), properties: { ...cityTree(4).properties, Delist_Date: 1700000000000 } }], "heritage-tree");
  assert.equal(places.length, 1);
  assert.equal(places[0].id, "portland:tree:51");
  assert.equal(places[0].name, "Oregon white oak (Heritage Tree #51)");
  assert.equal(places[0].scientificName, "Quercus garryana");
  assert.equal(places[0].treeOwnership, "Private, Front Yard");
  assert.equal(places[0].arrival, "approximate");
  assert.ok(!JSON.stringify(places).includes("MUST NOT BE PUBLISHED"));
  assert.throws(() => normalizeCityPlaces([cityTree(1), cityTree(1)], "heritage-tree"), /Duplicate/);
  assert.throws(() => normalizeCityPlaces([{ ...cityTree(1), properties: { ...cityTree(1).properties, STATUS: "Unknown" } }], "heritage-tree"), /status/);
  assert.throws(() => normalizeCityPlaces([{ ...cityTree(1), geometry: null }], "heritage-tree"), /geometry/);
});

test("normalizes active city gardens with stable GUIDs and shared park properties without merging distinct gardens", () => {
  const result = normalizeCityPlaces([cityGarden(1), cityGarden(2),
    { ...cityGarden(3), properties: { ...cityGarden(3).properties, Status: "Inactive" } }], "community-garden");
  assert.equal(result.length, 2);
  assert.equal(result[0].parkPropertyId, 89);
  assert.equal(result[0].arrival, "approximate");
  assert.match(result[0].id, /^portland:garden:37d4ec75/);
  assert.notEqual(result[0].id, result[1].id);
  assert.throws(() => normalizeCityPlaces([cityGarden(1), cityGarden(1)], "community-garden"), /Duplicate/);
  assert.throws(() => normalizeCityPlaces([{ ...cityGarden(1), geometry: null }], "community-garden"), /geometry/);
});

test("excludes closed and inactive markets and retains source-listed schedules without claiming live hours", () => {
  const result = normalizeCityPlaces([cityMarket(1),
    { ...cityMarket(2), properties: { ...cityMarket(2).properties, status: "Closed" } },
    { ...cityMarket(3), properties: { ...cityMarket(3).properties, status: "Inactive" } }], "farmers-market");
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "portland:market:1");
  assert.equal(result[0].marketHours, "9 a.m. - 1 p.m.");
  assert.equal(result[0].marketSeason, "May - October");
  assert.equal(result[0].address, "100 Main Street");
  assert.equal(result[0].website, "https://example.org");
  assert.throws(() => normalizeCityPlaces([{ ...cityMarket(1), properties: { ...cityMarket(1).properties, status: null } }], "farmers-market"), /status/);
  assert.throws(() => normalizeCityPlaces([{ ...cityMarket(1), geometry }], "farmers-market"), /geometry/);
});

test("fetches complete city place pages before normalizing, rejecting omitted records", async () => {
  for (const [category, fixture] of [["community-garden", cityGarden], ["farmers-market", cityMarket],
    ["public-restroom", cityRestroom], ["heritage-tree", cityTree], ["grocery-store", cityGrocery],
    ["reuse-repair", cityReuse], ["csa-pickup", cityCsa], ["bicycle-parking", cityBike]]) {
    const ids = Array.from({ length: 105 }, (_, i) => i + 1);
    const request = async url => {
      const params = new URL(url).searchParams;
      if (["reuse-repair", "csa-pickup"].includes(category) && !params.has("returnIdsOnly")) {
        assert.ok(!/phone|email/i.test(params.get("outFields")));
      }
      if (category === "heritage-tree" && !params.has("returnIdsOnly")) {
        assert.ok(!params.get("outFields").includes("Owner_name"));
        assert.ok(!params.get("outFields").includes("Owner_address"));
      }
      return params.has("returnIdsOnly") ? { objectIds: ids } :
        { features: params.get("objectIds").split(",").map(Number).map(fixture) };
    };
    assert.equal((await fetchCityPlaces(category, request)).places.length, 105);
    await assert.rejects(fetchCityPlaces(category, async url => url.includes("returnIdsOnly")
      ? { objectIds: [1, 2] } : { features: [fixture(1)] }), /omitted/);
    await assert.rejects(fetchCityPlaces(category, async url => url.includes("returnIdsOnly")
      ? { objectIds: [1] } : { features: [fixture(1)], exceededTransferLimit: true }), /Incomplete/);
  }
});

test("full and targeted refresh commands publish the intended snapshots without querying unrelated sources", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "places-cli-test-"));
  try {
    const scripts = path.join(directory, "scripts");
    const output = path.join(directory, "public", "data", "places");
    await mkdir(scripts);
    const script = path.join(scripts, "refresh-places.mjs");
    await writeFile(script, await readFile(new URL("./refresh-places.mjs", import.meta.url)));
    for (const module of ["arcgis.mjs", "context-overlays.mjs"]) {
      await writeFile(path.join(scripts, module), await readFile(new URL(`./${module}`, import.meta.url)));
    }
    const fixtures = {
      park: park(1), garden: cityGarden(1), market: cityMarket(1), restroom: cityRestroom(1), tree: cityTree(1),
      grocery: cityGrocery(1), reuse: cityReuse(1), csa: cityCsa(1), bike: cityBike(1),
      trail: trail(1), network: network(1), recommended: recommended(1),
      neighborhood: neighborhood(1), metro: metro(1, "Central Library"),
      fountain: amenity(1), seating: amenity(2, "Bench"), artwork: amenity(3, "Art Work"),
      streetTree: contextPoint(1), sidewalk: { ...contextPoint(1), geometry },
      crossing: contextPoint(1), deficiency: contextPoint(1),
      osm: { osm3s: { timestamp_osm_base: "2026-07-15T12:00:00Z" }, elements: [
        pod(1, "Example Food Carts"), ...Object.keys(CULTURE_SOURCES).map((category, i) => cultural(i + 2, category)),
        ...Object.keys(OUTING_SOURCES).map((category, i) => outing(i + 100, category))
      ] }
    };
    const amenities = ["drinking-fountain.json", "picnic-seating.json", "park-artwork.json"];
    const contexts = Object.keys(CONTEXT_SOURCES).flatMap(category => Object.keys(buildContextSnapshots(
      [fixtures[category === "street-trees" ? "streetTree" : category === "sidewalks" ? "sidewalk" :
        category === "crossings" ? "crossing" : "deficiency"]], category)));
    for (const [mode, expected] of [
      ["--amenities-only", amenities],
      ["--walking-trees-only", contexts],
      ["--gardens-markets-only", ["community-gardens.json", "farmers-markets.json"]],
      ["--restrooms-trees-only", ["public-restrooms.json", "heritage-trees.json"]],
      ["--everyday-only", ["grocery-stores.json", "reuse-repair.json", "csa-pickups.json", "bicycle-parking.json"]],
      ["--overlays-only", ["park-trails.json", "bicycle-network.json", "recommended-bike-routes.json"]],
      ["--neighborhoods-only", ["neighborhoods.json"]],
      ["--culture-only", Object.values(CULTURE_SOURCES).map(source => source.file)],
      ["--outings-only", Object.values(OUTING_SOURCES).map(source => source.file)],
      ["", ["parks.json", "food-cart-pods.json", "community-centers.json", "libraries.json",
        "community-gardens.json", "farmers-markets.json", "public-restrooms.json", "heritage-trees.json", "neighborhoods.json",
        "grocery-stores.json", "reuse-repair.json", "csa-pickups.json", "bicycle-parking.json",
        "park-trails.json", "bicycle-network.json", "recommended-bike-routes.json",
        ...Object.values(CULTURE_SOURCES).map(source => source.file),
        ...Object.values(OUTING_SOURCES).map(source => source.file), ...amenities, ...contexts]]
    ]) {
      const code = `
        const fixtures = ${JSON.stringify(fixtures)};
        process.argv = [process.execPath, ${JSON.stringify(script)}, ${JSON.stringify(mode)}];
        globalThis.fetch = async url => {
          const parsed = new URL(url);
          const pathname = parsed.pathname;
          let data;
          const where = parsed.searchParams.get("where") || "";
          const key = pathname.includes("/1291/") ?
            (where.includes("Picnic") || parsed.searchParams.get("objectIds") === "2" ? "seating" :
              where.includes("Art Work") || parsed.searchParams.get("objectIds") === "3" ? "artwork" : "fountain") :
            pathname.includes("/1415/") ? "streetTree" : pathname.includes("/77/") ? "sidewalk" :
            pathname.includes("/1400/") ? "crossing" : pathname.includes("/1411/") ? "deficiency" :
            pathname.includes("/216/") ? "garden" : pathname.includes("/187/") ? "market" :
            pathname.includes("/1304/") ? "restroom" : pathname.includes("/26/") ? "tree" :
            pathname.includes("/40/") ? "grocery" : pathname.includes("/1426/") ? "reuse" :
            pathname.includes("/188/") ? "csa" : pathname.includes("/62/") ? "bike" :
            pathname.includes("/27/") ? "trail" : pathname.includes("/75/") ? "network" :
            pathname.includes("/183/") ? "recommended" :
            pathname.includes("Boundary") ? "neighborhood" : pathname.includes("Environment") ? "park" :
            pathname.includes("arcgis") ? "metro" : "osm";
          if (${JSON.stringify(mode)} === "--gardens-markets-only" && !["garden", "market"].includes(key))
            throw new Error("Targeted refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--restrooms-trees-only" && !["restroom", "tree"].includes(key))
            throw new Error("Targeted refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--everyday-only" && !["grocery", "reuse", "csa", "bike"].includes(key))
            throw new Error("Everyday refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--overlays-only" && !["trail", "network", "recommended"].includes(key))
            throw new Error("Overlay refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--neighborhoods-only" && key !== "neighborhood")
            throw new Error("Neighborhood refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--amenities-only" && !["fountain", "seating", "artwork"].includes(key))
            throw new Error("Amenity refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--walking-trees-only" && !["streetTree", "sidewalk", "crossing", "deficiency"].includes(key))
            throw new Error("Context refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--culture-only" && key !== "osm")
            throw new Error("Culture refresh queried an unrelated source");
          if (${JSON.stringify(mode)} === "--outings-only" && key !== "osm")
            throw new Error("Outings refresh queried an unrelated source");
          if (key === "osm") data = fixtures.osm;
          else if (parsed.searchParams.has("returnIdsOnly")) data = {objectIds: [fixtures[key].properties.OBJECTID || 1]};
          else if (pathname.endsWith("/query")) data = {features: [fixtures[key]]};
          else data = {objectIdField: "FID", editingInfo: {dataLastEditDate: 1660000000000}};
          return {ok: true, json: async () => data};
        };
        await import(${JSON.stringify(pathToFileURL(script).href)});
      `;
      await promisify(execFile)(process.execPath, ["--input-type=module", "-e", code]);
      assert.deepEqual((await readdir(output)).sort(), expected.sort());
      await rm(output, { recursive: true });
    }
  } finally {
    await rm(directory, { recursive: true });
  }
});
