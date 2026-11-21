import { render, screen } from "@testing-library/react";
import moment from "moment";
import React from "react";
import OnTimeIndicator from "./OnTimeIndicator";

it("renders nothing without scheduled and estimated times", () => {
  const { container } = render(<OnTimeIndicator scheduled={undefined} estimated={undefined} />);
  expect(container).toBeEmptyDOMElement();
});

it.each([
  [1000, 1000, "On time"],
  [4000, 1000, "3s early"],
  [1000, 4000, "3s late"]
])("shows the arrival status rather than a child component name", (scheduled, estimated, expected) => {
  render(<OnTimeIndicator scheduled={moment(scheduled)} estimated={moment(estimated)} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});
