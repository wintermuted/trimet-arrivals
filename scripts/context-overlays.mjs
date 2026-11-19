import { createHash } from "node:crypto";
import { fetchArcgisFeatures } from "./arcgis.mjs";

const environment = "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer";
const transportation = "https://www.portlandmaps.com/od/rest/services/COP_OpenData_Transportation/MapServer";
export const CONTEXT_SOURCES = {
  "street-trees": {
    url: `${environment}/1415`, metadataId: 61079, fields: "OBJECTID,SPECIES",
    bureau: "Bureau of Parks and Recreation",
    coverage: "Street Tree Inventory active records, not just heritage trees. Points show inventory locations, not verified living trees, shade coverage, public entrances or permission to enter property."
  },
  sidewalks: {
    url: `${transportation}/77`, metadataId: 52484, fields: "OBJECTID,SidewalkType,Material,RampStyle",
    maxAllowableOffset: 0.000002,
    bureau: "Bureau of Transportation",
    coverage: "Mapped sidewalk asset polygons, including ramps, driveways, pads and mixed surface types. Display geometry is source-generalized with a 0.000002-degree tolerance, roughly 0.2 m, with original geometry retained for tiny assets that collapse under generalization; not survey boundaries. Gaps in this inventory do not prove a sidewalk is absent. Not a current condition, obstruction or accessibility assessment."
  },
  crossings: {
    url: `${transportation}/1400`, metadataId: 61072, fields: "OBJECTID,TranPlanID",
    bureau: "Bureau of Transportation",
    coverage: "PedPDX planning points from the April 2023 data update where crossings meet the Pedestrian Priority Network. Includes unpainted hardscape crossings; not every city crossing and not a live safety or accessibility assessment."
  },
  "crossing-deficiencies": {
    url: `${transportation}/1411`, metadataId: 61070, fields: "OBJECTID,StreetName,CrossStreet",
    bureau: "Bureau of Transportation",
    coverage: "PedPDX arterial-crossing planning deficiencies. These are historical analysis findings, not live closures, a declaration that all other crossings are safe, or routing instructions."
  }
};
const text = value => typeof value === "string" ? value.trim() : "";
const validPoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
  point[0] >= -123 && point[0] <= -122 && point[1] >= 45.3 && point[1] <= 45.8;
const ring = points => Array.isArray(points) && points.length >= 4 && points.every(validPoint) &&
  points[0].every((coordinate, i) => coordinate === points[points.length - 1][i]);
const polygon = rings => Array.isArray(rings) && rings.length > 0 && rings.every(ring);

export function contextGeometryValid(geometry, category) {
  if (category !== "sidewalks") return geometry?.type === "Point" && validPoint(geometry.coordinates);
  return geometry?.type === "Polygon" ? polygon(geometry.coordinates) :
    geometry?.type === "MultiPolygon" && Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 && geometry.coordinates.every(polygon);
}
export function buildContextSnapshots(features, category) {
  const source = CONTEXT_SOURCES[category];
  if (!source || !features.length) throw new Error(`Empty or unsupported context overlay ${category}`);
  const ids = new Set();
  const tiles = new Map();
  let omitted = 0;
  for (const feature of features) {
    const p = feature.properties || {};
    if (!Number.isInteger(p.OBJECTID) || p.OBJECTID <= 0 || ids.has(p.OBJECTID)) throw new Error(`Invalid ${category} ID`);
    ids.add(p.OBJECTID);
    if (feature.geometry == null || (feature.geometry.type === "Point" && feature.geometry.coordinates?.length === 0)) {
      omitted++;
      continue;
    }
    if (!contextGeometryValid(feature.geometry, category)) throw new Error(`Invalid ${category} geometry`);
    const points = feature.geometry.type === "Point" ? [feature.geometry.coordinates] :
      feature.geometry.type === "Polygon" ? feature.geometry.coordinates.flat() : feature.geometry.coordinates.flat(2);
    const [lng, lat] = points[0];
    const key = `${Math.floor((lng + 123) / 0.025)}-${Math.floor((lat - 45.3) / 0.025)}`;
    if (!tiles.has(key)) tiles.set(key, { features: [], bounds: [180, 90, -180, -90] });
    const tile = tiles.get(key);
    for (const point of points) {
      tile.bounds = [Math.min(tile.bounds[0], point[0]), Math.min(tile.bounds[1], point[1]),
        Math.max(tile.bounds[2], point[0]), Math.max(tile.bounds[3], point[1])];
    }
    tile.features.push({ type: "Feature", id: `portland:${category}:${p.OBJECTID}`, geometry: feature.geometry,
      properties: {
        name: category === "street-trees" ? text(p.SPECIES) || "Unidentified street tree" :
          category === "sidewalks" ? "Mapped sidewalk asset" :
          category === "crossings" ? "PedPDX mapped crossing" :
          [text(p.StreetName), text(p.CrossStreet)].filter(Boolean).join(" / ") || "PedPDX crossing deficiency",
        detail: category === "sidewalks" ?
          [text(p.SidewalkType), text(p.Material), text(p.RampStyle) && `Ramp: ${text(p.RampStyle)}`].filter(Boolean).join(" / ") :
          category === "street-trees" ? "Source inventory record; not a shade or access guarantee." :
          category === "crossings" ? "2023 planning inventory; not a safety guarantee." : "Planning deficiency; not a live closure."
      } });
  }
  if (omitted) console.warn(`Omitted ${omitted} unmapped ${category} inventory records.`);
  if (!tiles.size) throw new Error(`No mapped ${category} features`);
  const snapshots = {};
  const index = [];
  for (const [key, tile] of [...tiles].sort(([a], [b]) => a.localeCompare(b))) {
    tile.features.sort((a, b) => a.id.localeCompare(b.id));
    const hash = createHash("sha256").update(JSON.stringify(tile.features)).digest("hex").slice(0, 12);
    const file = `${category}-${key}-${hash}.json`;
    snapshots[file] = { type: "FeatureCollection", features: tile.features };
    index.push({ file, bounds: tile.bounds, count: tile.features.length });
  }
  snapshots[`${category}.json`] = {
    version: 1, category, retrievedAt: new Date().toISOString(),
    source: `City of Portland, ${source.bureau}`,
    sourceUrl: `https://www.portlandmaps.com/metadata/index.cfm?action=DisplayLayer&LayerID=${source.metadataId}`,
    license: "PDDL-1.0", licenseUrl: "https://www.portlandmaps.com/bps/arpa/tos.pdf",
    coverage: `${source.coverage} Unmapped records are omitted with refresh warnings.`,
    count: index.reduce((sum, tile) => sum + tile.count, 0), tiles: index
  };
  return snapshots;
}
export async function fetchContextFeatures(category, request) {
  const source = CONTEXT_SOURCES[category];
  if (!source) throw new Error(`Unsupported context category ${category}`);
  const features = await fetchArcgisFeatures(source, request);
  if (category === "sidewalks") {
    const collapsed = features.filter(feature => !contextGeometryValid(feature.geometry, category));
    if (collapsed.length) {
      const originals = await fetchArcgisFeatures({ ...source, maxAllowableOffset: undefined,
        where: `OBJECTID IN (${collapsed.map(feature => feature.properties.OBJECTID).join(",")})` }, request);
      const restored = new Map(originals.map(feature => [feature.properties.OBJECTID, feature]));
      if (restored.size !== collapsed.length || collapsed.some(feature => !restored.has(feature.properties.OBJECTID))) {
        throw new Error("Original sidewalk query omitted collapsed assets");
      }
      console.warn(`Retained original geometry for ${collapsed.length} sidewalk assets that did not survive display generalization.`);
      return features.map(feature => restored.get(feature.properties.OBJECTID) || feature);
    }
  }
  return features;
}
export async function fetchContextSnapshots(request) {
  const snapshots = {};
  for (const category of Object.keys(CONTEXT_SOURCES)) {
    Object.assign(snapshots, buildContextSnapshots(await fetchContextFeatures(category, request), category));
    console.log(`Prepared ${snapshots[`${category}.json`].count} ${category} features.`);
  }
  return snapshots;
}
