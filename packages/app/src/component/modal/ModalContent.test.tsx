import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import ModalContent from "./ModalContent";

it("shows a header but no route details without a route", () => {
  render(<ModalContent route={undefined} closeModal={jest.fn()} />);
  expect(screen.getByRole("heading", { name: "Route Info" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Directions:" })).not.toBeInTheDocument();
});

it("shows the route and its directions", () => {
  render(<ModalContent route={{ desc: "Burnside", dir: [{ desc: "To downtown", dir: 0 }], route: 20, type: "B" }} closeModal={jest.fn()} />);
  expect(screen.getByRole("heading", { name: "Burnside" })).toBeInTheDocument();
  expect(screen.getByText("Type: B")).toBeInTheDocument();
  expect(screen.getByText("To downtown | 0")).toBeInTheDocument();
});

it("closes when the close button is clicked", async () => {
  const closeModal = jest.fn();
  render(<ModalContent route={undefined} closeModal={closeModal} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
  expect(closeModal).toHaveBeenCalledTimes(1);
});
