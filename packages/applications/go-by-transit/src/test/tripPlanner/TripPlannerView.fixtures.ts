import { vi } from "vitest";
import { getStopCatalog, type StopCatalog } from "../../api/trimet/stopCatalog";
import { planTrip, type TripPlannerResponse } from "../../api/trimet/tripplanner";

export const loadCatalog = vi.mocked(getStopCatalog);
export const requestTrip = vi.mocked(planTrip);

export function catalog(): StopCatalog {
  return {
    stops: [
      {
        aliases: [],
        desc: "Pioneer Courthouse/SW 6th Ave MAX Stn",
        dir: "N",
        lat: 45.518967,
        lng: -122.67856,
        locid: 7777,
        seq: 1,
        tp: false,
      },
      {
        aliases: [],
        desc: "Gresham City Hall MAX Station",
        dir: "E",
        lat: 45.50569,
        lng: -122.43583,
        locid: 8356,
        seq: 1,
        tp: false,
      },
    ],
    routeCount: 2,
    directionCount: 4,
    stopReferenceCount: 3,
    incompleteRouteCount: 0,
    incompleteDirectionCount: 0,
    incompleteRouteNames: [],
    invalidStopCount: 0,
  };
}

export function itineraryResponse(
  overrides: Partial<TripPlannerResponse> = {},
): TripPlannerResponse {
  return {
    success: true,
    from: { description: "Gresham City Hall MAX Station", stopId: 8356 },
    to: { description: "Pioneer Courthouse/SW 6th Ave MAX Stn", stopId: 7777 },
    partial: false,
    itineraries: [
      {
        id: "1",
        startTime: "1:39 PM",
        endTime: "2:28 PM",
        duration: 51,
        numberOfTransfers: 1,
        walkingTime: 2,
        distance: 13.94,
        fare: 2.8,
        partial: false,
        legs: [
          {
            id: "1.1",
            mode: "Walk",
            from: { description: "Gresham City Hall MAX Station" },
            to: {
              description: "Gresham Central Transit Center",
              stopId: 8345,
            },
            duration: 2,
            distance: 0.06,
            partial: false,
          },
          {
            id: "1.2",
            mode: "Light Rail",
            from: {
              description: "Gresham Central Transit Center",
              stopId: 8345,
            },
            to: { description: "Union Station", stopId: 8230 },
            route: {
              number: "MAX",
              name: "MAX Blue Line to Portland",
            },
            startTime: "1:39 PM",
            endTime: "2:20 PM",
            partial: false,
          },
          {
            id: "1.3",
            mode: "Commuter Rail",
            from: { description: "Union Station", stopId: 8230 },
            to: { description: "Pioneer Courthouse", stopId: 7777 },
            route: { number: "WES", name: "WES to Beaverton" },
            startTime: "2:30 PM",
            endTime: "2:48 PM",
            partial: false,
          },
        ],
      },
      {
        id: "2",
        startTime: "1:50 PM",
        endTime: "2:45 PM",
        duration: 55,
        numberOfTransfers: 0,
        partial: false,
        legs: [
          {
            id: "2.1",
            mode: "Bus",
            from: { description: "Gresham City Hall" },
            to: { description: "Pioneer Courthouse" },
            route: { number: "20", name: "Burnside/Stark" },
            partial: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

