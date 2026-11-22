import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import BookmarksInSectionSelector from "./BookmarksInSectionSelector";

it("provides a labeled bookmark picker even with no bookmarks", () => {
  render(<BookmarksInSectionSelector bookmarksInSection={undefined} allBookmarks={undefined} onChange={vi.fn()} />);
  expect(screen.getByRole("combobox", { name: "Stops in this bookmark section" })).toBeInTheDocument();
});

it("selects a stop through the picker and forwards the selection", async () => {
  const onChange = vi.fn();
  render(<BookmarksInSectionSelector bookmarksInSection={[]} allBookmarks={[{ locid: 123, desc: "Main Street", dir: "N" }]} onChange={onChange} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Stops in this bookmark section" }));
  await user.click(screen.getByRole("option", { name: /Main Street/ }));
  expect(onChange).toHaveBeenCalledWith(
    [expect.objectContaining({ value: 123 })],
    expect.objectContaining({ action: "select-option", option: expect.objectContaining({ value: 123 }) })
  );
});
