import { render, screen } from "@testing-library/react";
import moment from "moment";
import React from "react";
import LateIndicator from "./LateIndicator";

it("shows a placeholder without an arrival estimate", () => {
  render(<LateIndicator scheduled={undefined} estimated={undefined} />);
  expect(screen.getByText("-")).toBeInTheDocument();
});

it.each([
  [1000, 50000, "49s late"],
  [1000, 5000000, "23m 19s late"]
])("formats the existing late-arrival estimate", (scheduled, estimated, expected) => {
  render(<LateIndicator scheduled={moment(scheduled)} estimated={moment(estimated)} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});
