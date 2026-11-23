import { render, screen } from "@testing-library/react";
import React from "react";
import { TimeToArrivalIndicator } from "..";

it("shows a placeholder without an arrival estimate", () => {
  render(<TimeToArrivalIndicator estimated={undefined} now={undefined} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});

it.each([
  [8000, "7s"],
  [100000, "1m 39s"],
  [61000, "1m 0s"],
  [5000000, "83m 19s"],
  [1500, "0s"],
  [1000, "Due"],
  [500, "Due"]
])("formats time remaining for an arrival", (estimated, expected) => {
  render(<TimeToArrivalIndicator estimated={estimated} now={1000} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});

it.each([NaN, Infinity, 0])("does not treat invalid times as Due (%s)", estimated => {
  render(<TimeToArrivalIndicator estimated={estimated} now={1000} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});
