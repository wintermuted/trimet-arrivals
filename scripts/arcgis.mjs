export async function requestJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Source request failed (${response.status}): ${new URL(url).hostname}`);
  const data = await response.json();
  if (data.error) throw new Error(`Source query failed: ${JSON.stringify(data.error)}`);
  return data;
}

export async function fetchArcgisFeatures(source, request = requestJson) {
  const ids = await request(`${source.url}/query?${new URLSearchParams({
    where: source.where || "1=1", returnIdsOnly: "true", f: "json"
  })}`);
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length ||
    ids.objectIds.some(id => !Number.isInteger(id) || id <= 0) ||
    new Set(ids.objectIds).size !== ids.objectIds.length) throw new Error("Invalid source IDs");
  const sorted = [...ids.objectIds].sort((a, b) => a - b);
  const pages = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, Math.ceil(sorted.length / 200)) }, async () => {
    while (next < sorted.length) {
      const offset = next;
      next += 200;
      const wanted = sorted.slice(offset, offset + 200);
      const page = await request(`${source.url}/query?${new URLSearchParams({
        objectIds: wanted.join(","), outFields: source.fields, outSR: "4326",
        geometryPrecision: "6", returnGeometry: "true", f: "geojson",
        ...(source.maxAllowableOffset ? { maxAllowableOffset: String(source.maxAllowableOffset) } : {})
      })}`);
      const returned = new Set(page.features?.map(feature => feature.properties?.OBJECTID));
      if (!Array.isArray(page.features) || page.exceededTransferLimit ||
        page.features.length !== wanted.length || returned.size !== wanted.length ||
        wanted.some(id => !returned.has(id))) throw new Error("Source page omitted or duplicated records");
      pages[offset / 200] = page.features;
    }
  }));
  return pages.flat();
}
