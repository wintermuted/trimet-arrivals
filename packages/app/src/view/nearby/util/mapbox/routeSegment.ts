import { Feature, LineString, MultiLineString, Position } from "geojson";
import { RouteDirectionStop } from "../../../../api/trimet/interfaces/routes";

export function getSelectedRouteSegment(
  feature: Feature<LineString | MultiLineString>,
  origin: RouteDirectionStop,
  destination: RouteDirectionStop
): Feature<LineString | MultiLineString> {
  const lines = feature.geometry.type === "LineString"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  function closestPoint(stop: RouteDirectionStop) {
    const longitudeScale = Math.cos(stop.lat * Math.PI / 180);
    let nearest: { line: number; index: number; fraction: number; point: Position };
    let minimum = Infinity;
    lines.forEach((line, lineIndex) => {
      line.slice(1).forEach((end, index) => {
        const start = line[index];
        const dx = (end[0] - start[0]) * longitudeScale;
        const dy = end[1] - start[1];
        const lengthSquared = dx * dx + dy * dy;
        const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
          ((stop.lng - start[0]) * longitudeScale * dx +
            (stop.lat - start[1]) * dy) / lengthSquared
        ));
        const point = [
          start[0] + (end[0] - start[0]) * fraction,
          start[1] + (end[1] - start[1]) * fraction
        ];
        const distance = Math.pow((point[0] - stop.lng) * longitudeScale, 2) +
          Math.pow(point[1] - stop.lat, 2);
        if (distance < minimum) {
          minimum = distance;
          nearest = { line: lineIndex, index, fraction, point };
        }
      });
    });
    if (!nearest) {
      throw new Error("Route geometry has no line segments");
    }
    return nearest;
  }

  const from = closestPoint(origin);
  const to = closestPoint(destination);
  const fromFirst = from.line < to.line || (
    from.line === to.line && from.index + from.fraction <= to.index + to.fraction
  );
  const start = fromFirst ? from : to;
  const end = fromFirst ? to : from;
  const selected: Position[][] = [];
  lines.forEach((line, index) => {
    if (index < start.line || index > end.line) {
      return;
    }
    const first = index === start.line ? start.index + 1 : 0;
    const last = index === end.line ? end.index + 1 : line.length;
    const points = [
      ...(index === start.line ? [start.point] : []),
      ...line.slice(first, last),
      ...(index === end.line ? [end.point] : [])
    ];
    const part = points.filter((point, i) =>
      i === 0 || point[0] !== points[i - 1][0] || point[1] !== points[i - 1][1]
    );
    if (part.length === 1) {
      part.push(part[0]);
    }
    selected.push(part);
  });
  if (!selected.length) {
    throw new Error("Selected stops do not span a route segment");
  }
  return {
    ...feature,
    geometry: selected.length === 1
      ? { type: "LineString", coordinates: selected[0] }
      : { type: "MultiLineString", coordinates: selected }
  };
}
