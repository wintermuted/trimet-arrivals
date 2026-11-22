import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { RemoveBookmarkSectionButton } from "./RemoveBookmarkSectionButton";

afterEach(() => vi.restoreAllMocks());

it.each([true, false])("only removes the section when deletion is confirmed (%s)", async (confirmed) => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(confirmed);
  const removeBookmarkSection = vi.fn();
  render(<RemoveBookmarkSectionButton removeBookmarkSection={removeBookmarkSection} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Remove Bookmark Section" }));
  expect(confirm).toHaveBeenCalledWith("Are you sure you want to remove this section?");
  expect(removeBookmarkSection).toHaveBeenCalledTimes(confirmed ? 1 : 0);
});
