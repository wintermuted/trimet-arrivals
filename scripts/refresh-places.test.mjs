import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fetchMetroPlaces, fetchNeighborhoods, fetchParks, normalizeMetroPlaces, normalizeNeighborhoods,
  normalizeParks, normalizePods, polygonPoint, writeSnapshots
} from "./refresh-places.mjs";

const geometry = { type: "Polygon", coordinates: [[[-122.7, 45.5], [-122.6, 45.5], [-122.6, 45.6], [-122.7, 45.5]]] };
const park = id => ({ properties: { OBJECTID: id, PROPERTYID: id, NAME: `Park ${id}` }, geometry });
const pod = (id, name, tags = {}) => ({ type: "node", id, lon: -122.67, lat: 45.52, tags: { amenity: "food_court", name, ...tags } });

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
