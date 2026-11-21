import { render, screen } from "@testing-library/react";
import moment from "moment";
import React from "react";
import { TimeToArrivalIndicator } from "..";

it("shows a placeholder without an arrival estimate", () => {
  render(<TimeToArrivalIndicator estimated={undefined} now={undefined} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});

it.each([
  [8000, "7s"],
  [100000, "1m 39s"]
])("formats time remaining for an arrival", (estimated, expected) => {
  render(<TimeToArrivalIndicator estimated={moment(estimated)} now={moment(1000)} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});
