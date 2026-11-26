import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlaceResultRow } from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import FontAwesome from "react-fontawesome";
import { expect, fn, userEvent, within } from "storybook/test";

const meta = {
  title: "Places/Result row",
  component: PlaceResultRow,
  args: {
    name: "Example Park",
    secondary: "Example Avenue",
    icon: (
      <FontAwesome
        name="tree"
        aria-hidden="true"
        className="transit-place-icon"
      />
    ),
    trailing: <FontAwesome name="angle-right" aria-hidden="true" />,
    renderLink: (props) => <a {...props} href="#example-place" />,
  },
  decorators: [
    (Story) => (
      <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 400 }}>
        <Story />
      </ul>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Shared nearby, search, and saved-place row layouts. The host supplies icons, highlighted labels, distances, navigation, and a separate action; buttons are never nested in the link.",
      },
    },
  },
} satisfies Meta<typeof PlaceResultRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Nearby: Story = {};
export const SearchHighlighted: Story = {
  args: {
    variant: "search",
    name: (
      <>
        <mark>Example</mark> Park
      </>
    ),
    secondary: "Park / Example Avenue",
    trailing: (
      <span className="transit-global-search-distance">
        <span>250 m</span>
        <small>straight-line</small>
      </span>
    ),
  },
};
const remove = fn();
export const SavedWithAction: Story = {
  args: {
    variant: "saved",
    secondary: "Park",
    trailing: undefined,
    action: (
      <Button size="sm" variant="ghost" onClick={remove}>
        Remove
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const action = canvas.getByRole("button", { name: "Remove" });
    await expect(canvas.getByRole("link").contains(action)).toBe(false);
    await userEvent.click(action);
    await expect(remove).toHaveBeenCalled();
  },
};
export const LongSearchLabel: Story = {
  args: {
    variant: "search",
    name: "A long example destination name at a busy intersection",
    secondary: "An equally long example address",
  },
};
export const MissingMetadata: Story = {
  args: {
    variant: "saved",
    secondary: undefined,
    icon: undefined,
    trailing: undefined,
  },
};
