import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import MainNavigationComponent from "./MainNavigationComponent";

it("renders navigation as bookmark counts change", () => {
  const { rerender } = render(
    <MemoryRouter>
      <MainNavigationComponent numberOfBookmarks={0} timeOfLastLoad="" />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeInTheDocument();
  rerender(
    <MemoryRouter>
      <MainNavigationComponent numberOfBookmarks={1} timeOfLastLoad="updated" />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("navigation", { name: "Primary navigation" }),
  ).toHaveTextContent("Bookmarks");
});
