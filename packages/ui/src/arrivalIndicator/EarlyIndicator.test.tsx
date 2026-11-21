import { render, screen } from "@testing-library/react";
import moment from "moment";
import React from "react";
import { EarlyIndicator } from "..";

it("shows a placeholder without an arrival estimate", () => {
  render(<EarlyIndicator scheduled={undefined} estimated={undefined} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});

it.each([
  [3000, 1000, "2s early"],
  [1000, 5000000, "36m 41s early"]
])("formats the existing early-arrival estimate", (scheduled, estimated, expected) => {
  render(<EarlyIndicator scheduled={moment(scheduled)} estimated={moment(estimated)} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});
