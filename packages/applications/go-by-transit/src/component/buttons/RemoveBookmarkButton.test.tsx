import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { RemoveBookmarkButton } from "./RemoveBookmarkButton";

it("removes the selected stop from its bookmark section", async () => {
  const removeBookmarkFromSection = vi.fn();
  render(<RemoveBookmarkButton stopId={123} removeBookmarkFromSection={removeBookmarkFromSection} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Remove bookmark from Bookmark Section" }));
  expect(removeBookmarkFromSection).toHaveBeenCalledWith(123, expect.anything());
});
