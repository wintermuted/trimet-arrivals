import { Feature, FeatureCollection, LineString, MultiLineString, Position } from "geojson";
import { getRouteById } from "../../../../api/trimet/routeConfig";
import { TripPlannerItinerary } from "../../../../api/trimet/tripplanner";
import { getDistance } from "../turfUtils";
import { getRouteGeometry } from "./routeLines";
import { getSelectedRouteSegment } from "./routeSegment";

type Path = LineString | MultiLineString;
type TripProperties = { trip: number };
const MAX_SNAP_MILES = 0.075;

function connectedShape(lines: Position[][], origin: Position, destination: Position) {
  // The bundled shapes may contain repeated and unordered segments from many trips.
  const graph = new Map<string, { point: Position; neighbors: Set<string> }>();
  const keyOf = ([lng, lat]: Position) => `${lng.toFixed(7)},${lat.toFixed(7)}`;
  for (const line of lines) {
    let previous: string | undefined;
    for (const point of line) {
      const key = keyOf(point);
      if (!graph.has(key)) graph.set(key, { point, neighbors: new Set() });
      if (previous && previous !== key) {
        graph.get(previous).neighbors.add(key);
        graph.get(key).neighbors.add(previous);
      }
      previous = key;
    }
  }
  function snap(point: Position) {
    let nearest: string | undefined;
    let distance = MAX_SNAP_MILES;
    for (const [key, node] of graph) {
      const candidate = getDistance(point, node.point);
      if (candidate < distance) {
        nearest = key;
        distance = candidate;
      }
    }
    return nearest;
  }
  const start = snap(origin);
  const end = snap(destination);
  if (!start || !end || start === end) return;
  const open = new Set([start]);
  const distances = new Map([[start, 0]]);
  const previous = new Map<string, string>();
  while (open.size) {
    let current: string | undefined;
    for (const key of open) {
      if (!current || distances.get(key) < distances.get(current)) current = key;
    }
    if (current === end) {
      const path: Position[] = [];
      for (let key = end; key; key = previous.get(key)) path.push(graph.get(key).point);
      return path.reverse();
    }
    open.delete(current);
    const node = graph.get(current);
    for (const neighbor of node.neighbors) {
      const distance = distances.get(current) + getDistance(node.point, graph.get(neighbor).point);
      if (distance < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, distance);
        previous.set(neighbor, current);
        open.add(neighbor);
      }
    }
  }
}

export async function loadPlannerPaths(
  itineraries: TripPlannerItinerary[],
  signal: AbortSignal
) {
  const routes = new Map<number, ReturnType<typeof getRouteById>>();
  const shapes = new Map<string, ReturnType<typeof getRouteGeometry>>();
  const coverage = await Promise.all(itineraries.map(async (itinerary, trip) => {
    const legs = await Promise.all(itinerary.legs.map(async (leg): Promise<Feature<Path, TripProperties> | undefined> => {
      const { from, to, route } = leg;
      const id = route?.internalNumber ?? Number(route?.number);
      if (!Number.isInteger(id) || id <= 0 || !from?.stopId || !to?.stopId ||
          from.stopId === to.stopId || leg.mode === "Walk") return;
      if (!routes.has(id)) routes.set(id, getRouteById(id, signal));
      try {
        const config = await routes.get(id);
        const matches = (config.route ?? []).flatMap(routeConfig =>
          (routeConfig.dir ?? []).flatMap(direction => {
            const origins = (direction.stop ?? []).filter(stop => stop.locid === from.stopId);
            const destinations = (direction.stop ?? []).filter(stop => stop.locid === to.stopId);
            return origins.flatMap(origin => destinations
              .filter(destination => origin.seq < destination.seq)
              .map(destination => ({ direction: direction.dir, origin, destination })));
          })
        );
        if (matches.length !== 1 || signal.aborted) return;
        const { direction, origin, destination } = matches[0];
        const key = `${id}/${direction}`;
        if (!shapes.has(key)) shapes.set(key, getRouteGeometry(String(id), direction, signal));
        const shape = await shapes.get(key);
        const originPoint = [from.lon ?? origin.lng, from.lat ?? origin.lat];
        const destinationPoint = [to.lon ?? destination.lng, to.lat ?? destination.lat];
        if (shape.geometry.type === "MultiLineString") {
          const coordinates = connectedShape(shape.geometry.coordinates, originPoint, destinationPoint);
          if (!coordinates) return;
          return { type: "Feature", geometry: { type: "LineString", coordinates }, properties: { trip } };
        }
        const { geometry } = getSelectedRouteSegment(shape, origin, destination);
        if (geometry.type !== "LineString") return;
        const { coordinates } = geometry;
        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];
        const matchesEndpoints = (a: Position, b: Position) =>
          getDistance(a, originPoint) <= MAX_SNAP_MILES &&
          getDistance(b, destinationPoint) <= MAX_SNAP_MILES;
        if ((!matchesEndpoints(start, end) && !matchesEndpoints(end, start)) ||
            getDistance(start, end) === 0) return;
        return { type: "Feature", geometry, properties: { trip } };
      } catch {
        // A missing or unreadable shape contributes to the visible coverage notice.
        return undefined;
      }
    }));
    return {
      total: legs.length,
      paths: legs.filter((path): path is Feature<Path, TripProperties> => Boolean(path))
    };
  }));
  const data: FeatureCollection<Path, TripProperties> = {
    type: "FeatureCollection",
    features: coverage.flatMap(trip => trip.paths)
  };
  return { data, coverage };
}
