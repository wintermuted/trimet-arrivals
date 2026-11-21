import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import BookmarkSectionNameControl from "./BookmarkSectionNameControl";

it("shows the name and toggles editing through the labeled control", async () => {
  const toggleEditMode = jest.fn();
  render(<BookmarkSectionNameControl editMode={false} name="Commute" removeBookmarkSection={jest.fn()} toggleEditMode={toggleEditMode} updateBookmarkSectionName={jest.fn()} />);
  expect(screen.getByRole("heading", { name: "Commute" })).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Edit bookmark section" }));
  expect(toggleEditMode).toHaveBeenCalledTimes(1);
});

it("edits the name and exposes removal controls in edit mode", async () => {
  const updateBookmarkSectionName = jest.fn();
  render(<BookmarkSectionNameControl editMode name="Commute" removeBookmarkSection={jest.fn()} toggleEditMode={jest.fn()} updateBookmarkSectionName={updateBookmarkSectionName} />);
  const input = screen.getByRole("textbox", { name: "Bookmark section name" });
  expect(input).toHaveValue("Commute");
  await userEvent.setup().type(input, " home");
  expect(updateBookmarkSectionName).toHaveBeenLastCalledWith("Commute home");
  expect(screen.getByRole("button", { name: "Remove Bookmark Section" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Finish editing section" })).toHaveAttribute("aria-pressed", "true");
});
