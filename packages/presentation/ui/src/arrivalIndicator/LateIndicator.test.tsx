import { render, screen } from "@testing-library/react";
import React from "react";
import { LateIndicator } from "..";

it("shows a placeholder without an arrival estimate", () => {
  render(<LateIndicator scheduled={undefined} estimated={undefined} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});

it.each([
  [1000, 50000, "49s late"],
  [1000, 61000, "1m 0s late"],
  [1000, 5000000, "83m 19s late"]
])("formats elapsed late-arrival time without wrapping", (scheduled, estimated, expected) => {
  render(<LateIndicator scheduled={scheduled} estimated={estimated} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});

it.each([NaN, Infinity, 0])("shows a placeholder for invalid timestamps (%s)", time => {
  render(<LateIndicator scheduled={time} estimated={1000} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});
