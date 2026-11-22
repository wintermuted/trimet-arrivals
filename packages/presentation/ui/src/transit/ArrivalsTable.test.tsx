import { vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import moment from "moment";
import { arrival1 } from "@overworld/trimet-client/fixtures";
import type { StopLocation } from "@overworld/trimet-client";
import { ArrivalsTableLoadMore } from "../transit";
import { TimeDisplayProvider } from "../TimeDisplay";
import { storeTimeFormat, storeTimezone } from "../timePreferences";

afterEach(() => localStorage.clear());

it("sorts and limits arrivals, expands and collapses, and uses injected presentation with time preferences", () => {
  localStorage.clear();
  storeTimeFormat("24h");
  storeTimezone("utc");
  const now = moment("2026-11-21T13:00:00Z");
  const stop: StopLocation = {
    desc: "Test stop", dir: "N", lat: 45, lng: -122,
    route: [{ route: 15, desc: "Test route", type: "B", dir: [] }],
  };
  const arrivals = [6, 2, 4, 1, 5, 3].map(index => ({
    ...arrival1, id: String(index), route: 15, shortSign: `Arrival ${index}`,
    feet: index * 100, estimated: now.valueOf() + index * 60000,
    scheduled: now.valueOf() + index * 60000,
  }));
  const formatDistance = vi.fn((feet: number) => `${feet} feet`);
  const { container } = render(<TimeDisplayProvider><ArrivalsTableLoadMore
    arrivals={arrivals} loading={false} now={now} stopLocation={stop}
    renderRouteIndicator={(id, route) => <a href={`/routes/${id}`}>{route?.desc}</a>}
    formatDistance={formatDistance}
  /></TimeDisplayProvider>);
  const signs = () => Array.from(container.querySelectorAll(".short-sign"), node => node.textContent);
  expect(signs()).toEqual(["Arrival 1", "Arrival 2", "Arrival 3", "Arrival 4", "Arrival 5"]);
  expect(screen.getAllByRole("link", { name: "Test route" })[0]).toHaveAttribute("href", "/routes/15");
  expect(screen.getByText("100 feet")).toBeInTheDocument();
  expect(formatDistance).toHaveBeenCalledWith(100);
  expect(container.querySelector(".estimated-scheduled-time")).toHaveTextContent("13:01:00 / 13:01:00");
  fireEvent.click(screen.getByRole("button", { name: "Show 1 more arrivals" }));
  expect(signs()).toEqual(["Arrival 1", "Arrival 2", "Arrival 3", "Arrival 4", "Arrival 5", "Arrival 6"]);
  fireEvent.click(screen.getByRole("button", { name: "Only show 5 arrivals" }));
  expect(signs()).toHaveLength(5);
});
