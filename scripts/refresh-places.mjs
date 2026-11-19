import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const PARKS_URL = "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer/35";
export const NEIGHBORHOODS_URL = "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Boundary/MapServer/3";
export const OSM_QUERY = '[out:json][timeout:60];area["boundary"="administrative"]["admin_level"="8"]["name"="Portland"]["wikidata"="Q6106"]->.p;nwr(area.p)["amenity"="food_court"];out center tags;';
export const METRO_SOURCES = {
  "community-center": {
    url: "https://services2.arcgis.com/McQ0OlIABe29rJJy/arcgis/rest/services/Community_Centers/FeatureServer/0",
    sourceUrl: "https://www.arcgis.com/home/item.html?id=d28668b7dde04a57b3b14f6cecccb4c1",
    file: "community-centers.json"
  },
  library: {
    url: "https://services2.arcgis.com/McQ0OlIABe29rJJy/arcgis/rest/services/Libraries/FeatureServer/0",
    sourceUrl: "https://www.arcgis.com/home/item.html?id=da2229f19d854845ae6e164d4924fe7a",
    file: "libraries.json"
  }
};
// Reviewed 2026-11-18 against these branches' official address and TriMet coordinate links.
const LIBRARY_CORRECTIONS = {
  "Albina Library": { previousAddress: "216 NE Knott St", address: "205 NE Russell Street",
    coordinates: [-122.663300, 45.541276], website: "https://multcolib.org/hours-and-locations/albina-library" },
  "Northwest Library": { previousAddress: "2300 NW Thurman St", address: "2030 NW Pettygrove Street",
    coordinates: [-122.6960768, 45.5325963], website: "https://multcolib.org/hours-and-locations/northwest-library" }
};
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const safeUrl = value => /^https?:\/\//i.test(value || "") ? value : undefined;
export const validPoint = point => Array.isArray(point) && point.length === 2 &&
  point.every(Number.isFinite) && point[0] >= -123 && point[0] <= -122 &&
  point[1] >= 45.3 && point[1] <= 45.8;

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polygonPoint(geometry) {
  const polygons = geometry?.type === "MultiPolygon" ? geometry.coordinates :
    geometry?.type === "Polygon" ? [geometry.coordinates] : [];
  const polygon = [...polygons].sort((a, b) => b[0].length - a[0].length)[0];
  if (!polygon?.[0]?.length || !polygon.every(ring => ring.length >= 4 && ring.every(validPoint))) {
    throw new Error("Park has invalid or out-of-coverage geometry");
  }
  const ring = polygon[0];
  const xs = ring.map(point => point[0]);
  const ys = ring.map(point => point[1]);
  const center = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  // A display point, never an asserted public entrance. Respect concavity and holes.
  return inRing(center, ring) && !polygon.slice(1).some(hole => inRing(center, hole))
    ? center : ring[0];
}

export function normalizeParks(features) {
  if (!features.length) throw new Error("City parks response was empty");
  const parks = new Map();
  for (const feature of features) {
    const { NAME: name, PROPERTYID: propertyId } = feature.properties || {};
    if (!name?.trim() || !Number.isInteger(propertyId)) throw new Error("Park is missing NAME or PROPERTYID");
    const place = {
      id: `portland:park:${propertyId}`, name: name.trim(), category: "park",
      coordinates: polygonPoint(feature.geometry),
      sourceUrl: "https://www.portlandmaps.com/metadata/index.cfm?action=DisplayLayer&LayerID=52451",
      arrival: "approximate"
    };
    const previous = parks.get(place.id);
    if (previous && previous.name !== place.name) throw new Error(`Conflicting park property ${propertyId}`);
    // Taxlot parts share a property ID. Use a deterministic representative part.
    if (!previous || place.coordinates.join(",") < previous.coordinates.join(",")) parks.set(place.id, place);
  }
  return [...parks.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function normalizePods(elements) {
  if (!elements.length) throw new Error("OSM food-court response was empty");
  const places = [];
  for (const element of [...elements].sort((a, b) => (a.type === "node" ? 1 : 0) - (b.type === "node" ? 1 : 0) || a.id - b.id)) {
    const tags = element.tags || {};
    const name = tags.name?.trim();
    const description = `${name || ""} ${tags.description || ""}`;
    if (tags.amenity !== "food_court" || !name || /^(private|no)$/.test(tags.access || "") ||
        ["disused", "abandoned", "demolished", "closed"].some(key => tags[key] === "yes" || tags[`${key}:amenity`]) ||
        (tags.indoor === "yes") || (tags.level && tags.level !== "0")) continue;
    // Generic indoor food halls and individual food trucks are not cart pods.
    const explicitPod = /food\s*cart|cart\s*(park|pod)|food\s*park|\bpod\b/i.test(description);
    const outdoorCourt = tags.landuse === "retail" && !tags.building;
    // Travel Portland's pod guide independently identifies these two names.
    const reviewedPod = ["Prost Marketplace", "Midtown Beer Garden"].includes(name);
    if (!explicitPod && !outdoorCourt && !reviewedPod) continue;
    const point = [element.lon ?? element.center?.lon, element.lat ?? element.center?.lat];
    if (!validPoint(point)) throw new Error(`Invalid OSM point ${element.type}/${element.id}`);
    const duplicate = places.find(place => place.name.toLowerCase() === name.toLowerCase() &&
      Math.hypot(place.coordinates[0] - point[0], place.coordinates[1] - point[1]) < 0.001);
    if (duplicate) {
      duplicate.address ||= [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || undefined;
      continue;
    }
    places.push({
      id: `osm:${element.type}:${element.id}`, name, category: "food-cart-pod",
      coordinates: point,
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      website: safeUrl(tags.website || tags["contact:website"]),
      address: [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || undefined,
      arrival: "approximate"
    });
  }
  if (!places.length) throw new Error("No food-cart pods passed inclusion rules");
  return places.sort((a, b) => a.id.localeCompare(b.id));
}

export function normalizeMetroPlaces(features, category) {
  if (!METRO_SOURCES[category]) throw new Error(`Unknown Metro category ${category}`);
  const places = new Map();
  for (const feature of features) {
    const properties = feature.properties || {};
    if (properties.CITY?.trim() !== "Portland" || properties.STATE?.trim() !== "OR") continue;
    const name = properties.NAME?.trim();
    if (!name) throw new Error(`Missing Metro ${category} name`);
    if (category === "library" && !/\blibrary\b/i.test(name)) continue;
    // The official directory listed this branch closed for construction at the review.
    // Recheck https://multcolib.org/hours-and-locations/hillsdale-library on refresh.
    if (category === "library" && name === "Hillsdale Library") continue;
    if (feature.geometry?.type !== "Point" || !validPoint(feature.geometry.coordinates)) {
      throw new Error(`Invalid Metro point for ${name}`);
    }
    if (category === "community-center" && !Number.isInteger(properties.SITEID)) {
      throw new Error(`Missing Metro community-center SITEID for ${name}`);
    }
    const correction = category === "library" ? LIBRARY_CORRECTIONS[name] : undefined;
    const corrected = correction && properties.ADDRESS?.trim() === correction.previousAddress;
    const place = {
      id: `metro:${category}:${category === "library" ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") : properties.SITEID}`,
      name, category, coordinates: corrected ? correction.coordinates : feature.geometry.coordinates,
      sourceUrl: METRO_SOURCES[category].sourceUrl,
      website: correction?.website || safeUrl(properties.WEB_URL?.trim()),
      address: corrected ? correction.address : properties.ADDRESS?.trim() || undefined,
      arrival: "approximate"
    };
    if (places.has(place.id)) throw new Error(`Duplicate Metro place ${place.id}`);
    places.set(place.id, place);
  }
  if (!places.size) throw new Error(`No Portland ${category} records passed inclusion rules`);
  return [...places.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function json(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Source request failed (${response.status}): ${new URL(url).hostname}`);
  const data = await response.json();
  if (data.error || data.remark) throw new Error(`Source returned an error: ${JSON.stringify(data.error || data.remark)}`);
  return data;
}

export async function fetchMetroPlaces(category, request = json) {
  const { url } = METRO_SOURCES[category];
  const metadata = await request(`${url}?f=json`);
  const edited = metadata.editingInfo?.dataLastEditDate;
  if (!Number.isFinite(edited)) throw new Error(`Metro ${category} source update date missing`);
  const where = "CITY = 'Portland' AND STATE = 'OR'";
  const ids = await request(`${url}/query?${new URLSearchParams({ where, returnIdsOnly: "true", f: "json" })}`);
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length) throw new Error(`Metro ${category} returned no IDs`);
  const uniqueIds = [...new Set(ids.objectIds)].sort((a, b) => a - b);
  const features = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const params = new URLSearchParams({ objectIds: uniqueIds.slice(offset, offset + 100).join(","),
      outFields: "*", outSR: "4326", returnGeometry: "true", f: "geojson" });
    const page = await request(`${url}/query?${params}`);
    if (!Array.isArray(page.features) || page.exceededTransferLimit) throw new Error(`Incomplete Metro ${category} page`);
    features.push(...page.features);
  }
  const returnedIds = new Set(features.map(feature => feature.properties?.[metadata.objectIdField]));
  if (returnedIds.size !== uniqueIds.length || uniqueIds.some(id => !returnedIds.has(id))) {
    throw new Error(`Metro ${category} query omitted records`);
  }
  return { places: normalizeMetroPlaces(features, category), sourceUpdatedAt: new Date(edited).toISOString() };
}

export async function fetchParks(request = json) {
  const ids = await request(`${PARKS_URL}/query?where=1%3D1&returnIdsOnly=true&f=json`);
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length) throw new Error("City returned no park IDs");
  const uniqueIds = [...new Set(ids.objectIds)].sort((a, b) => a - b);
  const features = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const params = new URLSearchParams({
      objectIds: uniqueIds.slice(offset, offset + 100).join(","),
      outFields: "OBJECTID,PROPERTYID,NAME", outSR: "4326", returnGeometry: "true", f: "geojson"
    });
    const page = await request(`${PARKS_URL}/query?${params}`);
    if (!Array.isArray(page.features) || page.exceededTransferLimit) throw new Error("Incomplete city park page");
    features.push(...page.features);
  }
  const returnedIds = new Set(features.map(feature => feature.properties?.OBJECTID));
  if (returnedIds.size !== uniqueIds.length || uniqueIds.some(id => !returnedIds.has(id))) {
    throw new Error("City park query omitted records");
  }
  return normalizeParks(features);
}

export function normalizeNeighborhoods(features) {
  if (!features.length) throw new Error("City neighborhood response was empty");
  const ids = new Set();
  return features.map(feature => {
    const { ID: id, MAPLABEL: label, NAME: name, SHARED: shared } = feature.properties || {};
    const geometry = feature.geometry;
    const polygons = geometry?.type === "MultiPolygon" ? geometry.coordinates :
      geometry?.type === "Polygon" ? [geometry.coordinates] : [];
    if (!Number.isInteger(id) || id < 0 || ids.has(id) || !(label || name)?.trim() ||
        !["Y", "N"].includes(shared) || !polygons.length || !polygons.every(polygon =>
          Array.isArray(polygon) && polygon.length && polygon.every(ring =>
            Array.isArray(ring) && ring.length >= 4 && ring.every(validPoint) &&
            ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]))) {
      throw new Error(`Invalid or duplicate neighborhood polygon ${id}`);
    }
    ids.add(id);
    return { type: "Feature", id: `portland:neighborhood:${id}`,
      properties: { name: (label || name).trim(), shared: shared === "Y", areaId: id }, geometry };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchNeighborhoods(request = json) {
  const ids = await request(`${NEIGHBORHOODS_URL}/query?where=1%3D1&returnIdsOnly=true&f=json`);
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length) throw new Error("City returned no neighborhood IDs");
  const uniqueIds = [...new Set(ids.objectIds)].sort((a, b) => a - b);
  const features = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const params = new URLSearchParams({
      objectIds: uniqueIds.slice(offset, offset + 100).join(","),
      outFields: "OBJECTID,ID,NAME,MAPLABEL,SHARED", outSR: "4326",
      geometryPrecision: "6", returnGeometry: "true", f: "geojson"
    });
    const page = await request(`${NEIGHBORHOODS_URL}/query?${params}`);
    if (!Array.isArray(page.features) || page.exceededTransferLimit) throw new Error("Incomplete city neighborhood page");
    features.push(...page.features);
  }
  const returnedIds = new Set(features.map(feature => feature.properties?.OBJECTID));
  if (returnedIds.size !== uniqueIds.length || uniqueIds.some(id => !returnedIds.has(id))) {
    throw new Error("City neighborhood query omitted records");
  }
  return {
    type: "FeatureCollection", version: 1, retrievedAt: new Date().toISOString(),
    source: "City of Portland, Bureau of Planning and Sustainability",
    sourceUrl: "https://www.portlandmaps.com/metadata/index.cfm?action=DisplayLayer&LayerID=53509",
    license: "PDDL-1.0", licenseUrl: "https://www.portlandmaps.com/bps/arpa/tos.pdf",
    coverage: "Neighborhood association bylaw boundaries, including shared areas. For map context, not legal boundaries, entrances, or routing destinations.",
    features: normalizeNeighborhoods(features)
  };
}

export async function writeSnapshots(directory, snapshots) {
  await mkdir(directory, { recursive: true });
  const old = new Map();
  const names = Object.keys(snapshots);
  const replaced = [];
  for (const name of names) {
    try { old.set(name, await readFile(path.join(directory, name))); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  try {
    for (const name of names) {
      await writeFile(path.join(directory, `${name}.tmp`), `${JSON.stringify(snapshots[name])}\n`);
    }
    for (const name of names) {
      await rename(path.join(directory, `${name}.tmp`), path.join(directory, name));
      replaced.push(name);
    }
  } catch (error) {
    for (const name of replaced) {
      if (old.has(name)) await writeFile(path.join(directory, name), old.get(name));
      else await rm(path.join(directory, name), { force: true });
    }
    throw error;
  } finally {
    for (const name of names) await rm(path.join(directory, `${name}.tmp`), { force: true });
  }
}

async function main() {
  if (process.argv.includes("--neighborhoods-only")) {
    const neighborhoods = await fetchNeighborhoods();
    await writeSnapshots(path.join(ROOT, "public", "data", "places"), { "neighborhoods.json": neighborhoods });
    console.log(`Refreshed ${neighborhoods.features.length} neighborhood boundary areas, including shared areas.`);
    return;
  }
  const endpoint = process.env.OVERPASS_URL || "https://overpass.kumi.systems/api/interpreter";
  const parks = await fetchParks();
  const inputIndex = process.argv.indexOf("--osm-input");
  if (inputIndex >= 0 && !process.argv[inputIndex + 1]) throw new Error("--osm-input requires a raw Overpass JSON file");
  const osm = inputIndex >= 0
    ? JSON.parse((await readFile(process.argv[inputIndex + 1], "utf8")).replace(/^\uFEFF/, ""))
    : await json(endpoint, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: OSM_QUERY })
  });
  if (osm.remark || osm.error) throw new Error("Overpass response is incomplete or failed");
  const pods = normalizePods(osm.elements || []);
  const centers = await fetchMetroPlaces("community-center");
  const libraries = await fetchMetroPlaces("library");
  const neighborhoods = await fetchNeighborhoods();
  const retrievedAt = new Date().toISOString();
  if (!Number.isFinite(Date.parse(osm.osm3s?.timestamp_osm_base))) throw new Error("OSM source timestamp missing");
  const snapshots = {
    "neighborhoods.json": neighborhoods,
    "parks.json": {
      version: 1, category: "park", retrievedAt, source: "City of Portland, Bureau of Parks and Recreation",
      sourceUrl: "https://gis-pdx.opendata.arcgis.com/datasets/parks/about",
      license: "PDDL-1.0", licenseUrl: "https://www.portlandmaps.com/bps/arpa/tos.pdf",
      coverage: "City parks system, including some properties outside city limits. Boundaries do not establish public access or entrances.",
      places: parks
    },
    "food-cart-pods.json": {
      version: 1, category: "food-cart-pod", retrievedAt, sourceUpdatedAt: osm.osm3s.timestamp_osm_base,
      source: "OpenStreetMap contributors", sourceUrl: "https://www.openstreetmap.org/copyright",
      license: "ODbL-1.0", licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      coverage: "Named cart pods mapped as food courts within Portland's OSM administrative boundary. Incomplete; not live opening or closure information.",
      places: pods
    }
  };
  for (const [category, data] of [["community-center", centers], ["library", libraries]]) {
    snapshots[METRO_SOURCES[category].file] = {
      version: 1, category, retrievedAt, sourceUpdatedAt: data.sourceUpdatedAt,
      source: "Metro Regional Land Information System (RLIS)", sourceUrl: METRO_SOURCES[category].sourceUrl,
      license: "RLIS Open Database End User License Agreement",
      licenseUrl: "https://rlisdiscovery.oregonmetro.gov/pages/open-database-license",
      coverage: "Portland-addressed records, including nearby unincorporated areas. " +
        (category === "library"
          ? "Older public-library points; Albina and Northwest relocations corrected against the official directory on 2026-11-18. Hillsdale omitted while listed closed for construction. Verify current location and hours with the library."
          : "Public-serving community facilities, not only city-operated centers. Programs may have eligibility requirements or fees. Verify access with the center."),
      places: data.places
    };
  }
  await writeSnapshots(path.join(ROOT, "public", "data", "places"), snapshots);
  console.log(`Refreshed ${parks.length} parks, ${pods.length} food-cart pods, ${centers.places.length} community centers, ${libraries.places.length} libraries, and ${neighborhoods.features.length} neighborhood boundary areas. OSM data as of ${osm.osm3s.timestamp_osm_base}. Review data changes before publishing.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Places refresh failed; retained previous snapshots. ${error.message}`); process.exitCode = 1; });
}
