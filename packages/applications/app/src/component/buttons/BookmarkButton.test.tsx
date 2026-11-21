import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import BookmarkButton from "./BookmarkButton";

it.each([false, true])("forwards the stop and its bookmarked state (%s)", async (bookmarked) => {
  const onBookmarkClick = jest.fn();
  const stop = { locid: 123 };
  render(<BookmarkButton stopLocation={stop} stopIsBookmarked={bookmarked} onBookmarkClick={onBookmarkClick} />);
  const button = screen.getByRole("button", { name: bookmarked ? "Remove stop bookmark" : "Bookmark this stop" });
  expect(button).toHaveAttribute("aria-pressed", String(bookmarked));
  await userEvent.setup().click(button);
  expect(onBookmarkClick).toHaveBeenCalledWith(stop, bookmarked, expect.anything());
});
