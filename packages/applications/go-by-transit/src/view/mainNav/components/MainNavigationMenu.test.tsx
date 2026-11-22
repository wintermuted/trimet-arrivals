import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import MainNavigationMenu from "./MainNavigationMenu";

it("marks the current route and exposes the app destinations", () => {
  render(<MemoryRouter initialEntries={["/bookmarks"]}><MainNavigationMenu numberOfBookmarks={1} timeOfLastLoad="" /></MemoryRouter>);
  const navigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
  expect(navigation.getByRole("link", { name: "Bookmarks" })).toHaveAttribute("aria-current", "page");
  expect(navigation.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/", "/nearby", "/planner", "/stops", "/lines/all", "/bookmarks"]);
});

it("opens navigation and closes it on Escape, returning focus to its trigger", async () => {
  render(<MemoryRouter><MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "Open navigation" })).toHaveFocus();
});
