import { render, screen } from "@testing-library/react";
import React from "react";
import { EarlyIndicator } from "..";

it("shows a placeholder without an arrival estimate", () => {
  render(<EarlyIndicator scheduled={undefined} estimated={undefined} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});

it.each([
  [3000, 1000, "2s early"],
  [61000, 1000, "1m 0s early"],
  [5000000, 1000, "83m 19s early"]
])("formats elapsed early-arrival time without wrapping", (scheduled, estimated, expected) => {
  render(<EarlyIndicator scheduled={scheduled} estimated={estimated} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});

it.each([NaN, Infinity, 0])("shows a placeholder for invalid timestamps (%s)", time => {
  render(<EarlyIndicator scheduled={1000} estimated={time} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});
