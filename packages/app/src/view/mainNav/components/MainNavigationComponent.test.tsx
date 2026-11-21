import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import MainNavigationComponent from "./MainNavigationComponent";

it("initializes on mount and renders navigation", () => {
  const onInitialLoad = jest.fn();
  const { rerender } = render(<MemoryRouter><MainNavigationComponent numberOfBookmarks={0} timeOfLastLoad="" onInitialLoad={onInitialLoad} /></MemoryRouter>);
  expect(onInitialLoad).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  rerender(<MemoryRouter><MainNavigationComponent numberOfBookmarks={1} timeOfLastLoad="updated" onInitialLoad={onInitialLoad} /></MemoryRouter>);
  expect(onInitialLoad).toHaveBeenCalledTimes(1);
});
