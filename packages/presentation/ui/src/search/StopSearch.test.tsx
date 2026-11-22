import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { StopCatalog } from "@overworld/trimet-client";
import { StopSearch } from "../search";

const catalog: StopCatalog = {
  stops: [8200, 1200, 2200, 3200, 4200, 5200, 200].map(locid => ({
    locid, desc: "Central Station", aliases: ["Metro hub"], dir: "E",
    lat: 45.5, lng: -122.5, seq: 1, tp: false,
  })),
  routeCount: 1, directionCount: 1, stopReferenceCount: 7,
  incompleteRouteCount: 0, incompleteDirectionCount: 0,
  incompleteRouteNames: [], invalidStopCount: 0,
};
const renderStopLinks = (stop: StopCatalog["stops"][number]) =>
  <a href={`/choose/${stop.locid}`}>Choose {stop.locid}</a>;

it("prioritizes exact IDs, caps results at six, searches aliases, and renders caller links", () => {
  render(<StopSearch catalog={catalog} loading={false} error={false} onRetry={jest.fn()}
    renderStopLinks={renderStopLinks} footer={<a href="/browse">Browse injected stops</a>} />);
  const input = screen.getByRole("searchbox", { name: "Stop name or ID" });
  fireEvent.change(input, { target: { value: " 200 " } });
  const list = screen.getByRole("list", { name: "Matching stops" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(6);
  expect(within(list).getAllByRole("link")[0]).toHaveAttribute("href", "/choose/200");
  expect(screen.getByText("Showing 6 of 7 matches. Refine your search to see fewer results.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse injected stops" })).toHaveAttribute("href", "/browse");
  fireEvent.change(input, { target: { value: "Metro hub" } });
  expect(within(list).getAllByRole("listitem")).toHaveLength(6);
});

it("preserves typed queries across loading, failure, retry, and partial catalog recovery", () => {
  const onRetry = jest.fn();
  const props = { loading: true, error: false, onRetry, renderStopLinks };
  const { rerender } = render(<StopSearch {...props} />);
  const input = screen.getByRole("searchbox", { name: "Stop name or ID" });
  fireEvent.change(input, { target: { value: "Missing stop" } });
  expect(screen.getByText("Loading TriMet stops…")).toBeInTheDocument();
  expect(screen.queryByText(/No stops match/)).not.toBeInTheDocument();
  rerender(<StopSearch {...props} loading={false} error />);
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load TriMet stops");
  fireEvent.click(screen.getByRole("button", { name: "Retry loading stops" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  rerender(<StopSearch {...props} />);
  expect(input).toHaveValue("Missing stop");
  rerender(<StopSearch {...props} loading={false} catalog={{ ...catalog, invalidStopCount: 1 }} />);
  expect(screen.getByText(/No stops match/)).toBeInTheDocument();
  expect(screen.getByText(/partial stop list/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "   " } });
  expect(screen.queryByText(/No stops match/)).not.toBeInTheDocument();
});

it("gives multiple standalone instances unique input and heading associations", () => {
  render(<><StopSearch loading error={false} onRetry={jest.fn()} renderStopLinks={renderStopLinks} />
    <StopSearch loading error={false} onRetry={jest.fn()} renderStopLinks={renderStopLinks} /></>);
  const inputs = screen.getAllByRole("searchbox", { name: "Stop name or ID" });
  expect(inputs[0].id).not.toBe(inputs[1].id);
  const regions = screen.getAllByRole("region", { name: "Find a stop" });
  expect(regions[0].getAttribute("aria-labelledby")).not.toBe(regions[1].getAttribute("aria-labelledby"));
});
