const fs = require("fs");
const path = require("path");

function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function joinConnectedLines(lines) {
  const pending = lines.map(line => [...line]);
  const connected = [];
  while (pending.length) {
    let line = pending.shift();
    let index = 0;
    while (index < pending.length) {
      const next = pending[index];
      if (samePoint(line[line.length - 1], next[0])) {
        line = line.concat(next.slice(1));
      } else if (samePoint(line[line.length - 1], next[next.length - 1])) {
        line = line.concat([...next].reverse().slice(1));
      } else if (samePoint(line[0], next[next.length - 1])) {
        line = next.slice(0, -1).concat(line);
      } else if (samePoint(line[0], next[0])) {
        line = [...next].reverse().slice(0, -1).concat(line);
      } else {
        index++;
        continue;
      }
      pending.splice(index, 1);
      index = 0;
    }
    connected.push(line);
  }
  return connected;
}

function lineParts(geometry) {
  if (geometry.type === "LineString") {
    return [geometry.coordinates];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates;
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(lineParts);
  }
  throw new Error(`Unsupported route geometry: ${geometry.type}`);
}

function mergeRouteFeatures(features) {
  const groups = new Map();
  features.forEach(feature => {
    const key = `${feature.properties.route_number}_${feature.properties.direction}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(feature);
  });
  return [...groups.values()].map(parts => {
    if (parts.length === 1) {
      return parts[0];
    }
    const lines = parts.flatMap(part => lineParts(part.geometry));
    const connected = joinConnectedLines(lines);
    return {
      ...parts[parts.length - 1],
      geometry: connected.length === 1
        ? { type: "LineString", coordinates: connected[0] }
        : { type: "MultiLineString", coordinates: connected }
    };
  });
}

if (require.main === module) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "tm_routes.json"), "utf8"));
  const destination = path.resolve(__dirname, "..", "public", "data", "trimet", "geoJSON");
  mergeRouteFeatures(data.features).forEach(feature => {
    const { route_number: route, direction } = feature.properties;
    const directory = path.join(destination, String(route));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, `${route}_${direction}.json`), JSON.stringify(feature));
  });
}

module.exports = { mergeRouteFeatures };
