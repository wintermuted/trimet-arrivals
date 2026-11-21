import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VehiclePosition, VehicleTripSnapshot } from "@trimet-arrivals/trimet-client";
import { VehicleTripProgress } from "../vehicles";

const now = Date.parse("2026-11-21T13:00:00Z");
const selection: VehiclePosition = {
  id: "4003", type: "bus", tripId: "trip", blockId: "1547", routeNumber: 15,
  longitude: -122.68, latitude: 45.51, time: now, expires: now + 60000,
};
const data: VehicleTripSnapshot = {
  queryTime: now, partial: false,
  trip: {
    tripId: "trip", destination: "Test destination", progressAvailable: true,
    stops: ["Alpha", "Bravo", "Charlie"].map((name, index) => ({
      id: String(index + 1), name, sequence: index + 1, passed: index === 0,
      status: "normal", scheduled: now + index * 60000,
    })),
  },
};
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

it("renders standalone progress with an injected header, timezone, and map controls", () => {
  const onViewChange = jest.fn();
  const { container } = render(<VehicleTripProgress selection={selection} vehicle={selection}
    tracking ended={false} paused={false} result={{ data, receivedAt: now, loading: false, retry: jest.fn() }}
    view="chase" onViewChange={onViewChange} timeZone="UTC" header={<h2>Injected trip header</h2>}
  />);
  expect(screen.getByRole("heading", { name: "Injected trip header" })).toBeInTheDocument();
  expect(container.querySelector('[aria-current="step"]')).toHaveTextContent("Bravo");
  expect(screen.getByText("Next stop: Bravo")).toBeInTheDocument();
  expect(screen.getByText(/Heading unavailable/)).toBeInTheDocument();
  expect(container.querySelector("time")).toHaveTextContent("1:00 PM");
  expect(container.querySelector("time")).toHaveAttribute("dateTime", "2026-11-21T13:00:00.000Z");
  fireEvent.click(screen.getByRole("button", { name: "North-up" }));
  expect(onViewChange).toHaveBeenCalledWith("north-up");
});

it("retains last-known legs on failure and exposes the supplied retry action", () => {
  const retry = jest.fn();
  const { container } = render(<VehicleTripProgress selection={selection}
    tracking ended={false} paused={false} result={{ data, receivedAt: now, loading: false, error: "Feed unavailable", retry }}
    view="north-up" onViewChange={jest.fn()} header={null}
  />);
  expect(screen.getByRole("alert")).toHaveTextContent("Feed unavailable");
  expect(screen.getByText("Current at last report")).toBeInTheDocument();
  expect(container.querySelector('[aria-current="step"]')).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry trip progress" }));
  expect(retry).toHaveBeenCalledTimes(1);
});
