import type { RouteDataResultSet } from "../interfaces/routes";

const routeStopDirections = [];

const route1 = {
  desc: "TrimetRoute 1",
  dir: routeStopDirections,
  id: 1,
  route: 1,
  routeColor: "string",
  routeSortOrder: 123,
  type: "B"
};

const route2 = {
  desc: "TrimetRoute 2",
  dir: routeStopDirections,
  id: 2,
  route: 2,
  routeColor: "string",
  routeSortOrder: 123,
  type: "B"
};

const route3 = {
  desc: "TrimetRoute 3",
  dir: routeStopDirections,
  id: 3,
  route: 3,
  routeColor: "string",
  routeSortOrder: 123,
  type: "B"
};

const route4 = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 3,
  route: 3,
  routeColor: "string",
  routeSortOrder: 123,
  type: "B"
};

const blueLine = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 100,
  route: 100,
  routeColor: "string",
  routeSortOrder: 123,
  type: "T"
};

const redLine = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 90,
  route: 90,
  routeColor: "string",
  routeSortOrder: 123,
  type: "T"
};

const greenLine = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 200,
  route: 200,
  routeColor: "string",
  routeSortOrder: 123,
  type: "T"
};

const yellowLine = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 190,
  route: 190,
  routeColor: "string",
  routeSortOrder: 123,
  type: "T"
};

const orangeLine = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 290,
  route: 290,
  routeColor: "string",
  routeSortOrder: 123,
  type: "T"
};

const streetCarSLine = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 193,
  route: 193,
  routeColor: "string",
  routeSortOrder: 123,
  type: "S"
};

const streetCarBLoop = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 195,
  route: 195,
  routeColor: "string",
  routeSortOrder: 123,
  type: "S"
};

const streetCarALoop = {
  desc: "TrimetRoute 4",
  dir: routeStopDirections,
  id: 194,
  route: 194,
  routeColor: "string",
  routeSortOrder: 123,
  type: "S"
};

export function allRoutesFixtureData(): Promise<RouteDataResultSet> {
  const routeData: RouteDataResultSet = {
    route: [
      route1,
      route2,
      route3,
      route4,
      blueLine,
      redLine,
      greenLine,
      yellowLine,
      orangeLine,
      streetCarSLine,
      streetCarBLoop,
      streetCarALoop
    ]
  };

  return Promise.resolve(routeData);
}
