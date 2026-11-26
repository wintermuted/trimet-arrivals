import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookmarkToggle, type BookmarkToggleProps } from "@overworld/ui";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

function ControlledBookmarkToggle(args: BookmarkToggleProps) {
  const [isBookmarked, setBookmarked] = useState(args.isBookmarked);
  useEffect(() => setBookmarked(args.isBookmarked), [args.isBookmarked]);
  return (
    <BookmarkToggle
      {...args}
      isBookmarked={isBookmarked}
      onClick={(event) => {
        args.onClick(event);
        setBookmarked((current) => !current);
      }}
    />
  );
}

const meta = {
  title: "Bookmarks/Bookmark toggle",
  component: BookmarkToggle,
  args: {
    isBookmarked: false,
    bookmarkLabel: "Bookmark this stop",
    removeLabel: "Remove stop bookmark",
    variant: "secondary",
    onClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          "Controlled bookmark action with an accessible pressed state. Hosts supply labels and own the entity, persistence, errors, and state updates.",
      },
    },
  },
} satisfies Meta<typeof BookmarkToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unsaved: Story = {};
export const Saved: Story = { args: { isBookmarked: true } };
export const WithLabel: Story = { args: { showLabel: true } };
export const TextOnlyRoute: Story = {
  args: {
    bookmarkLabel: "Bookmark Route 15",
    removeLabel: "Remove Route 15 bookmark",
    showLabel: true,
    showIcon: false,
    variant: undefined,
  },
};
export const Disabled: Story = { args: { disabled: true, showLabel: true } };
export const ToggleBookmark: Story = {
  render: (args) => <ControlledBookmarkToggle {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Bookmark this stop" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Remove stop bookmark" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove stop bookmark" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Bookmark this stop" }),
    ).toHaveAttribute("aria-pressed", "false");
  },
};
