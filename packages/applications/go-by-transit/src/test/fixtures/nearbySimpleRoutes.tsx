import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Arrival, ArrivalData } from "../../api/trimet/interfaces/arrivals";
import { StopData, StopLocation, TrimetRoute } from "../../api/trimet/interfaces/types";
import { arrival1 } from "../../api/trimet/fixture/arrival";

export const now = Date.parse("2026-11-15T10:00:00Z");
export const minute = 60 * 1000;
export const route: TrimetRoute = {
  desc: "Beaverton",
  dir: [
    { desc: "Northbound", dir: 0 },
    { desc: "Southbound", dir: 1 },
  ],
  route: 54,
  type: "bus",
};

export function stop(locid: number, distance: number): StopLocation {
  return {
    desc: `Stop ${locid}`,
    dir: "N",
    lat: 0,
    lng: distance,
    locid,
    route: [route],
  };
}

export const nearbyStops: StopData = {
  location: [stop(101, 0.01), stop(102, 0.02)],
  queryTime: "",
};

export function arrival(overrides: Partial<Arrival> = {}): Arrival {
  return {
    ...arrival1,
    dir: 0,
    estimated: now + 10 * minute,
    id: "arrival",
    locid: 101,
    route: 54,
    scheduled: now + 8 * minute,
    ...overrides,
  };
}

export function response(arrivals: Arrival[]): ArrivalData {
  return {
    arrival: arrivals,
    detour: [],
    location: [],
    queryTime: String(now),
  };
}

export function CurrentLocation() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  );
}

export function BrowserHistory() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>Browser back</button>
      <button onClick={() => navigate(1)}>Browser forward</button>
      <button onClick={() => navigate("?route=12")}>Open route 12</button>
    </>
  );
}

