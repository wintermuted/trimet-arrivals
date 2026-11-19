import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const PARKS_URL = "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer/35";
export const NEIGHBORHOODS_URL = "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Boundary/MapServer/3";
export const CITY_PLACE_SOURCES = {
  "community-garden": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Miscellaneous/MapServer/216",
    metadataId: 54459, file: "community-gardens.json", bureau: "Bureau of Parks and Recreation"
  },
  "farmers-market": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_ImportantPlaces/MapServer/187",
    metadataId: 54387, file: "farmers-markets.json", bureau: "Bureau of Planning and Sustainability"
  },
  "public-restroom": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Miscellaneous/MapServer/1304",
    metadataId: 60891, file: "public-restrooms.json", bureau: "Bureau of Parks and Recreation",
    fields: "OBJECTID,Property,Building,Room,Status,ADA",
    coverage: "Parks-system restroom rooms, not a citywide directory. Source-closed rooms and records without mapped coordinates are excluded; unknown status is retained. Co-located rooms remain distinct. Listed hours and ADA information are not live or verified; seasonal closures, fees and building access restrictions may apply."
  },
  "heritage-tree": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer/26",
    metadataId: 52455, file: "heritage-trees.json", bureau: "Bureau of Parks and Recreation",
    fields: "OBJECTID,TREEID,STATUS,COMMON,SCIENTIFIC,SITE_ADDRESS,Ownership,Delist_Date",
    coverage: "Source-designated Heritage trees only; removed, merit and delisted records are excluded. Points mark trunks, not public entrances. Some trees are on private land or not visible from public paths. View only from lawful public access; do not enter private property."
  },
  "grocery-store": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_ImportantPlaces/MapServer/40",
    metadataId: 54182, file: "grocery-stores.json", bureau: "Bureau of Planning and Sustainability",
    fields: "OBJECTID,NAME,ADDRESS,STATUS",
    coverage: "City full-service grocery inventory, including nearby locations. Source-closed stores are excluded. Existing status does not verify current operation, hours, stock or entrances."
  },
  "reuse-repair": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_ImportantPlaces/MapServer/1426",
    sourceUrl: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_ImportantPlaces/MapServer/1426",
    file: "reuse-repair.json", bureau: "Bureau of Planning and Sustainability",
    fields: "OBJECTID,Organization,Address,Website,Service,Additional_service,What_they_offer_accept,What_they_offer_accept_2,What_they_offer_accept_3",
    coverage: "Mapped Resourceful PDX reuse, repair, donation, swap and lending organizations within the app's Portland-area coverage. Unmapped records are omitted with refresh warnings. Not a complete or live directory. Confirm hours, eligibility, appointments, accepted items and fees before visiting or donating."
  },
  "csa-pickup": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_ImportantPlaces/MapServer/188",
    metadataId: 54388, file: "csa-pickups.json", bureau: "Bureau of Planning and Sustainability",
    fields: "OBJECTID,Farm_Name,Location,Status,Website,Season,Main_Products",
    coverage: "Source-active CSA drop-offs with numbered site addresses within the app's Portland-area coverage. City-only, street-only and out-of-coverage records are omitted with refresh warnings. Separate farm offerings at the same site remain distinct. Membership, scheduled pickup and permission may be required; not a public market or live schedule."
  },
  "bicycle-parking": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Transportation/MapServer/62",
    metadataId: 52921, file: "bicycle-parking.json", bureau: "Bureau of Transportation",
    fields: "OBJECTID,AssetID,NumSpaces,Covered",
    coverage: "Mapped bicycle-rack assets in the public right-of-way, not all bicycle parking. Each marker and cluster count represents racks, not spaces or parking areas. Separate racks at one location remain distinct. Capacity and cover are source-listed, not live availability, condition or security."
  }
};
const citySourceUrl = source => source.sourceUrl ||
  `https://www.portlandmaps.com/metadata/index.cfm?action=DisplayLayer&LayerID=${source.metadataId}`;
const EVERYDAY_CATEGORIES = ["grocery-store", "reuse-repair", "csa-pickup", "bicycle-parking"];
export const LINE_OVERLAY_SOURCES = {
  "park-trails": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer/27",
    metadataId: 52963, file: "park-trails.json", bureau: "Bureau of Parks and Recreation",
    fields: "OBJECTID,Local_Name,TYPE,STATUS,SURFACE", where: "1=1",
    coverage: "Existing mapped park trail centerlines in the Portland area. Excludes proposed, informal, closed, water, maintenance and retired CAT roads. Unspecified trail types are retained. Not verified current access, accessibility or permission to cycle."
  },
  "bicycle-network": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Transportation/MapServer/75",
    metadataId: 53123, file: "bicycle-network.json", bureau: "Bureau of Transportation",
    fields: "OBJECTID,SegmentName,Status,Facility,YearRetired", where: "Status = 'ACTIVE' AND YearRetired IS NULL",
    coverage: "Source-active bicycle network segments without a retirement year. Includes mixed facility types, not only protected lanes. Planned, future-development recommendations, retired and undefined-status segments are excluded. Not live condition, direction or safety information."
  },
  "recommended-bike-routes": {
    url: "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Transportation/MapServer/183",
    metadataId: 54399, file: "recommended-bike-routes.json", bureau: "Bureau of Transportation",
    fields: "OBJECTID,StreetName,ConnectionType", where: "1=1",
    coverage: "The City's recommended cycling map, distinct from future-development recommendations in the Bicycle Network layer. Includes difficult and higher-traffic connections and direction-dependent facilities. Difficult, moderate/high-traffic and unclassified connections are marked for caution. Not a guarantee of low stress, protection, legal direction, current access or safety."
  }
};
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

export function normalizeCityPlaces(features, category) {
  if (!features.length) throw new Error(`City ${category} response was empty`);
  if (EVERYDAY_CATEGORIES.includes(category)) return normalizeEverydayPlaces(features, category);
  if (category === "public-restroom" || category === "heritage-tree") return normalizeCityDestinations(features, category);
  const places = new Map();
  for (const feature of features) {
    const properties = feature.properties || {};
    const garden = category === "community-garden";
    const status = garden ? properties.Status : properties.status;
    if (typeof status !== "string" || !["active", "inactive", "closed"].includes(status.trim().toLowerCase())) {
      throw new Error(`Unrecognized ${category} status`);
    }
    if (status.trim().toLowerCase() !== "active") continue;
    const name = (garden ? properties.Site_Name : properties.Market)?.trim();
    const guid = properties.GlobalID?.replace(/[{}]/g, "").toLowerCase();
    if (!name || (garden ? !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(guid || "") :
      !Number.isInteger(properties.OBJECTID))) throw new Error(`Missing ${category} name or source ID`);
    const coordinates = garden ? polygonPoint(feature.geometry) : feature.geometry?.coordinates;
    if (!validPoint(coordinates) || (!garden && feature.geometry?.type !== "Point")) {
      throw new Error(`Invalid ${category} geometry`);
    }
    const text = value => typeof value === "string" ? value.trim() || undefined : undefined;
    const place = {
      id: garden ? `portland:garden:${guid}` : `portland:market:${properties.OBJECTID}`,
      name, category, coordinates, arrival: "approximate",
      sourceUrl: `https://www.portlandmaps.com/metadata/index.cfm?action=DisplayLayer&LayerID=${CITY_PLACE_SOURCES[category].metadataId}`,
      ...(garden ? {
        parkPropertyId: Number.isInteger(properties.PropertyID) && properties.PropertyID > 0 ? properties.PropertyID : undefined,
        website: "https://www.portland.gov/parks/community-gardens"
      } : {
        address: text(properties.Location), website: safeUrl(text(properties.Website)),
        marketDays: text(properties.Day), marketSeason: text(properties.Open_Dates), marketHours: text(properties.Open_Times)
      })
    };
    if (places.has(place.id)) throw new Error(`Duplicate ${category} source ID`);
    places.set(place.id, place);
  }
  if (!places.size) throw new Error(`No active ${category} records`);
  return [...places.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeEverydayPlaces(features, category) {
  const places = new Map();
  const text = value => typeof value === "string" ? value.trim() || undefined : undefined;
  for (const feature of features) {
    const p = feature.properties || {};
    if (category === "grocery-store" || category === "csa-pickup") {
      const status = text(category === "grocery-store" ? p.STATUS : p.Status)?.toLowerCase();
      const statuses = category === "grocery-store" ? ["existing", "closed"] : ["active", "inactive", "closed"];
      if (!statuses.includes(status)) throw new Error(`Unrecognized ${category} status`);
      if (status !== statuses[0]) continue;
    }
    const bike = category === "bicycle-parking";
    const sourceId = bike ? text(p.AssetID) : p.OBJECTID;
    const name = bike ? `Bicycle rack ${sourceId}` :
      text(category === "grocery-store" ? p.NAME : category === "csa-pickup" ? p.Farm_Name : p.Organization);
    if (!name || (bike ? !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(sourceId || "") :
      !Number.isInteger(sourceId) || sourceId <= 0)) throw new Error(`Missing ${category} name or source ID`);
    const address = text(category === "grocery-store" ? p.ADDRESS : category === "csa-pickup" ? p.Location : p.Address);
    if (category === "csa-pickup" && !/^\d+\s+\S/.test(address || "")) {
      console.warn(`Omitted CSA pickup ${sourceId}: source does not identify a numbered pickup-site address.`);
      continue;
    }
    const coordinates = feature.geometry?.coordinates;
    if (feature.geometry?.type === "Point" && Array.isArray(coordinates) && !coordinates.length) {
      console.warn(`Omitted ${category} ${sourceId}: source has no mapped coordinates.`);
      continue;
    }
    if (feature.geometry?.type !== "Point" || !Array.isArray(coordinates) ||
      coordinates.length !== 2 || !coordinates.every(Number.isFinite) || Math.abs(coordinates[0]) > 180 ||
      Math.abs(coordinates[1]) > 90) throw new Error(`Invalid ${category} geometry`);
    if (!validPoint(coordinates)) {
      console.warn(`Omitted ${category} ${sourceId}: outside Portland-area map coverage.`);
      continue;
    }
    const prefix = { "grocery-store": "grocery", "reuse-repair": "reuse", "csa-pickup": "csa", "bicycle-parking": "bike" }[category];
    const id = `portland:${prefix}:${sourceId}`;
    if (places.has(id)) throw new Error(`Duplicate ${category} source ID`);
    const covered = text(p.Covered);
    if (bike && (p.NumSpaces != null && (!Number.isInteger(p.NumSpaces) || p.NumSpaces < 0) ||
      !["Y", "N", "U", undefined].includes(covered))) throw new Error(`Invalid bicycle-parking capacity or cover for ${sourceId}`);
    const website = text(p.Website);
    places.set(id, {
      id, name, category, coordinates, address, arrival: "approximate",
      sourceUrl: citySourceUrl(CITY_PLACE_SOURCES[category]), website: safeUrl(website) ||
        (website && /^(?:www\.)?[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(website) ? `https://${website}` : undefined),
      ...(category === "reuse-repair" ? {
        reuseServices: [...new Set([text(p.Service), text(p.Additional_service)].filter(Boolean))].join(", ") || undefined,
        reuseItems: [...new Set([text(p.What_they_offer_accept), text(p.What_they_offer_accept_2), text(p.What_they_offer_accept_3)].filter(Boolean))].join(", ") || undefined
      } : category === "csa-pickup" ? {
        pickupSeason: text(p.Season), pickupProducts: text(p.Main_Products)
      } : bike ? {
        bikeSpaces: p.NumSpaces ?? undefined, bikeCovered: covered === "Y" ? "yes" : covered === "N" ? "no" : "unknown"
      } : {})
    });
  }
  if (!places.size) throw new Error(`No eligible ${category} records`);
  return [...places.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeCityDestinations(features, category) {
  const restroom = category === "public-restroom";
  const places = new Map();
  const text = value => typeof value === "string" ? value.trim() || undefined : undefined;
  for (const feature of features) {
    const properties = feature.properties || {};
    const status = text(restroom ? properties.Status : properties.STATUS)?.toLowerCase();
    if (!(restroom ? ["1", "2", "3"] : ["heritage", "merit", "removed"]).includes(status)) {
      throw new Error(`Unrecognized ${category} status`);
    }
    if (restroom ? status === "3" : status !== "heritage" || properties.Delist_Date != null) continue;
    const sourceId = restroom ? properties.OBJECTID : properties.TREEID;
    const title = text(restroom ? properties.Property : properties.COMMON);
    if (!Number.isInteger(sourceId) || sourceId <= 0 || !title) throw new Error(`Missing ${category} name or source ID`);
    if (restroom && feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates) && !feature.geometry.coordinates.length) {
      console.warn(`Omitted restroom ${sourceId} (${title}): source has no mapped coordinates.`);
      continue;
    }
    if (feature.geometry?.type !== "Point" || !validPoint(feature.geometry.coordinates)) {
      throw new Error(`Invalid ${category} geometry`);
    }
    const id = `portland:${restroom ? "restroom" : "tree"}:${sourceId}`;
    if (places.has(id)) throw new Error(`Duplicate ${category} source ID`);
    places.set(id, {
      id, category, coordinates: feature.geometry.coordinates, arrival: "approximate",
      name: restroom ? [title, text(properties.Building), text(properties.Room)].filter(Boolean).join(" - ") : `${title} (Heritage Tree #${sourceId})`,
      sourceUrl: `https://www.portlandmaps.com/metadata/index.cfm?action=DisplayLayer&LayerID=${CITY_PLACE_SOURCES[category].metadataId}`,
      ...(restroom ? {
        restroomStatus: status === "1" ? "listed-24-7" : "unknown",
        restroomAda: ["yes", "no"].includes(text(properties.ADA)?.toLowerCase()) ? text(properties.ADA).toLowerCase() : "unknown"
      } : {
        address: text(properties.SITE_ADDRESS), scientificName: text(properties.SCIENTIFIC),
        treeOwnership: text(properties.Ownership)
      })
    });
  }
  if (!places.size) throw new Error(`No eligible ${category} records`);
  return [...places.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchCityPlaces(category, request = json) {
  const source = CITY_PLACE_SOURCES[category];
  if (!source) throw new Error(`Unsupported city place category ${category}`);
  const ids = await request(`${source.url}/query?where=1%3D1&returnIdsOnly=true&f=json`);
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length) throw new Error(`City returned no ${category} IDs`);
  const uniqueIds = [...new Set(ids.objectIds)].sort((a, b) => a - b);
  const features = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const params = new URLSearchParams({
      objectIds: uniqueIds.slice(offset, offset + 100).join(","),
      outFields: source.fields || (category === "community-garden" ? "OBJECTID,GlobalID,PropertyID,Site_Name,Status" :
        "OBJECTID,Market,Location,Day,Open_Dates,Open_Times,Website,status"),
      outSR: "4326", returnGeometry: "true", f: "geojson"
    });
    const page = await request(`${source.url}/query?${params}`);
    if (!Array.isArray(page.features) || page.exceededTransferLimit) throw new Error(`Incomplete ${category} page`);
    features.push(...page.features);
  }
  const returnedIds = new Set(features.map(feature => feature.properties?.OBJECTID));
  if (returnedIds.size !== uniqueIds.length || uniqueIds.some(id => !returnedIds.has(id))) {
    throw new Error(`City ${category} query omitted records`);
  }
  return {
    version: 1, category, retrievedAt: new Date().toISOString(),
    source: `City of Portland, ${source.bureau}`,
    sourceUrl: citySourceUrl(source),
    license: "PDDL-1.0", licenseUrl: "https://www.portlandmaps.com/bps/arpa/tos.pdf",
    coverage: source.coverage || (category === "community-garden"
      ? "City-managed community garden areas listed active in the source. Plots may require registration or have restricted access. Display points are not verified entrances."
      : "Farmers markets listed active in the City source, not a complete or live directory. Seasonal dates and hours may be old; confirm the current schedule and location on the market website."),
    places: normalizeCityPlaces(features, category)
  };
}

export function normalizeLineOverlay(features, category) {
  const source = LINE_OVERLAY_SOURCES[category];
  if (!source || !features.length) throw new Error(`Empty or unsupported line overlay ${category}`);
  const ids = new Set();
  const text = value => typeof value === "string" ? value.trim() : "";
  const lines = [];
  for (const feature of features) {
    const p = feature.properties || {};
    if (!Number.isInteger(p.OBJECTID) || p.OBJECTID <= 0 || ids.has(p.OBJECTID)) throw new Error(`Invalid or duplicate ${category} ID`);
    ids.add(p.OBJECTID);
    if (category === "park-trails") {
      if (!["existing", "proposed", "informal", "closed"].includes(text(p.STATUS).toLowerCase())) throw new Error("Unrecognized trail status");
      if (text(p.STATUS).toLowerCase() !== "existing" ||
        ["water trail", "Maintenance Road", "CAT Road (retired)"].includes(text(p.TYPE))) continue;
    }
    if (category === "bicycle-network") {
      if (!["ACTIVE", "PLANNED", "RECOMM", "NONE", "RETIRED"].includes(text(p.Status))) throw new Error("Unrecognized bicycle network status");
      if (text(p.Status) !== "ACTIVE" || p.YearRetired != null) continue;
    }
    const geometry = feature.geometry;
    if (geometry == null) {
      console.warn(`Omitted ${category} segment ${p.OBJECTID}: source has no mapped geometry.`);
      continue;
    }
    const parts = geometry?.type === "LineString" ? [geometry.coordinates] :
      geometry?.type === "MultiLineString" ? geometry.coordinates : undefined;
    if (!Array.isArray(parts) || !parts.length || !parts.every(part => Array.isArray(part) && part.length >= 2 &&
      part.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
        Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90))) throw new Error(`Invalid ${category} line geometry`);
    if (!parts.every(part => part.every(validPoint))) {
      console.warn(`Omitted ${category} segment ${p.OBJECTID}: outside Portland-area map coverage.`);
      continue;
    }
    const connection = text(p.ConnectionType);
    const knownConnections = ["BBL", "BL", "BL_VHT", "BL-DC", "BL-MUP", "BL-SR_LT", "BL-SR_MT",
      "DC", "MUP_P", "MUP_U", "NG", "SC", "SR_DC", "SR_LT", "SR_MT", "SR_MT-DC"];
    if (category === "recommended-bike-routes" && connection && !knownConnections.includes(connection)) {
      throw new Error(`Unrecognized recommended route connection ${connection}`);
    }
    lines.push({ type: "Feature", id: `portland:${category}:${p.OBJECTID}`, geometry,
      properties: {
        name: text(category === "park-trails" ? p.Local_Name : category === "bicycle-network" ? p.SegmentName : p.StreetName) ||
          (category === "park-trails" ? "Unnamed park trail" : "Unnamed bicycle segment"),
        kind: category === "recommended-bike-routes" && (!connection || /DC|VHT|SR_MT/.test(connection)) ? "caution" : "standard",
        detail: category === "park-trails" ? [text(p.TYPE), text(p.SURFACE)].filter(Boolean).join(" / ") :
          category === "bicycle-network" ? text(p.Facility) : connection || "Unclassified connection"
      } });
  }
  if (!lines.length) throw new Error(`No eligible ${category} segments`);
  return lines.sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchLineOverlay(category, request = json) {
  const source = LINE_OVERLAY_SOURCES[category];
  if (!source) throw new Error(`Unsupported line overlay ${category}`);
  const ids = await request(`${source.url}/query?${new URLSearchParams({ where: source.where, returnIdsOnly: "true", f: "json" })}`);
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length) throw new Error(`No ${category} IDs`);
  const unique = [...new Set(ids.objectIds)].sort((a, b) => a - b);
  const features = [];
  for (let offset = 0; offset < unique.length; offset += 200) {
    const params = new URLSearchParams({ objectIds: unique.slice(offset, offset + 200).join(","),
      outFields: source.fields, outSR: "4326", geometryPrecision: "6", returnGeometry: "true", f: "geojson" });
    const page = await request(`${source.url}/query?${params}`);
    if (!Array.isArray(page.features) || page.exceededTransferLimit) throw new Error(`Incomplete ${category} page`);
    features.push(...page.features);
  }
  const returned = new Set(features.map(feature => feature.properties?.OBJECTID));
  if (features.length !== unique.length || returned.size !== unique.length || unique.some(id => !returned.has(id))) {
    throw new Error(`${category} query omitted or duplicated records`);
  }
  return { type: "FeatureCollection", version: 1, category, retrievedAt: new Date().toISOString(),
    source: `City of Portland, ${source.bureau}`, sourceUrl: citySourceUrl(source),
    license: "PDDL-1.0", licenseUrl: "https://www.portlandmaps.com/bps/arpa/tos.pdf",
    coverage: `${source.coverage} Unmapped and out-of-coverage segments are omitted with refresh warnings.`,
    features: normalizeLineOverlay(features, category) };
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
  if (process.argv.includes("--overlays-only")) {
    const snapshots = {};
    for (const category of Object.keys(LINE_OVERLAY_SOURCES)) snapshots[LINE_OVERLAY_SOURCES[category].file] = await fetchLineOverlay(category);
    await writeSnapshots(path.join(ROOT, "public", "data", "places"), snapshots);
    console.log(`Refreshed ${Object.values(snapshots).map(snapshot => `${snapshot.features.length} ${snapshot.category}`).join(", ")} segments. Review access and source-listed conditions before publishing.`);
    return;
  }
  if (process.argv.includes("--everyday-only")) {
    const snapshots = {};
    for (const category of EVERYDAY_CATEGORIES) snapshots[CITY_PLACE_SOURCES[category].file] = await fetchCityPlaces(category);
    await writeSnapshots(path.join(ROOT, "public", "data", "places"), snapshots);
    console.log(`Refreshed ${Object.values(snapshots).map(snapshot => `${snapshot.places.length} ${snapshot.category}`).join(", ")} records. Review site access and source-listed information before publishing.`);
    return;
  }
  if (process.argv.includes("--restrooms-trees-only")) {
    const restrooms = await fetchCityPlaces("public-restroom");
    const trees = await fetchCityPlaces("heritage-tree");
    await writeSnapshots(path.join(ROOT, "public", "data", "places"), {
      "public-restrooms.json": restrooms, "heritage-trees.json": trees
    });
    console.log(`Refreshed ${restrooms.places.length} restroom rooms and ${trees.places.length} heritage trees. Review source status and access before publishing.`);
    return;
  }
  if (process.argv.includes("--gardens-markets-only")) {
    const gardens = await fetchCityPlaces("community-garden");
    const markets = await fetchCityPlaces("farmers-market");
    await writeSnapshots(path.join(ROOT, "public", "data", "places"), {
      "community-gardens.json": gardens, "farmers-markets.json": markets
    });
    console.log(`Refreshed ${gardens.places.length} community gardens and ${markets.places.length} farmers markets. Review source-listed status and schedules before publishing.`);
    return;
  }
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
  const gardens = await fetchCityPlaces("community-garden");
  const markets = await fetchCityPlaces("farmers-market");
  const restrooms = await fetchCityPlaces("public-restroom");
  const trees = await fetchCityPlaces("heritage-tree");
  const retrievedAt = new Date().toISOString();
  if (!Number.isFinite(Date.parse(osm.osm3s?.timestamp_osm_base))) throw new Error("OSM source timestamp missing");
  const snapshots = {
    "community-gardens.json": gardens, "farmers-markets.json": markets,
    "public-restrooms.json": restrooms, "heritage-trees.json": trees,
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
  for (const category of EVERYDAY_CATEGORIES) snapshots[CITY_PLACE_SOURCES[category].file] = await fetchCityPlaces(category);
  for (const category of Object.keys(LINE_OVERLAY_SOURCES)) snapshots[LINE_OVERLAY_SOURCES[category].file] = await fetchLineOverlay(category);
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
  console.log(`Refreshed ${parks.length} parks, ${pods.length} food-cart pods, ${centers.places.length} community centers, ${libraries.places.length} libraries, ${gardens.places.length} community gardens, ${markets.places.length} farmers markets, ${restrooms.places.length} restroom rooms, ${trees.places.length} heritage trees, ${EVERYDAY_CATEGORIES.map(category => `${snapshots[CITY_PLACE_SOURCES[category].file].places.length} ${category}`).join(", ")} records, and ${neighborhoods.features.length} neighborhood boundary areas. OSM data as of ${osm.osm3s.timestamp_osm_base}. Review data changes before publishing.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Places refresh failed; retained previous snapshots. ${error.message}`); process.exitCode = 1; });
}
