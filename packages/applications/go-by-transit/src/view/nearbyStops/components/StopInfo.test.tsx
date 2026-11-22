import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import StopInfo from "./StopInfo";

it("renders nothing without a stop", () => {
  const { container } = render(<StopInfo stopLocation={undefined} onClick={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

it("shows the stop name, direction, and distance", () => {
  render(<MemoryRouter><StopInfo stopLocation={{ locid: 123, desc: "Main Street", dir: "N", distance: 456, route: [] }} onClick={jest.fn()} /></MemoryRouter>);
  expect(screen.getByRole("heading")).toHaveTextContent("Main Street - N -456 feet away");
});
