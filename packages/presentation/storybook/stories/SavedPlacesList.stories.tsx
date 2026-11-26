import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  SavedPlacesList,
  type SavedPlacesListProps,
  type SavedPlaceItem,
} from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

const places: SavedPlaceItem[] = ["Example Garden", "Example Park"].map(
  (name, index) => ({
    id: String(index),
    name,
    secondary: index ? "Park" : "Garden",
    renderLink: (props) => <a {...props} href="#example-place" />,
  }),
);
function ControlledSavedPlaces(args: SavedPlacesListProps) {
  const [saved, setSaved] = useState(args.places);
  useEffect(() => setSaved(args.places), [args.places]);
  return (
    <SavedPlacesList
      {...args}
      places={saved}
      onRemove={(id) => {
        args.onRemove(id);
        setSaved((previous) => previous.filter((place) => place.id !== id));
      }}
    />
  );
}
const meta = {
  title: "Places/Saved places",
  component: SavedPlacesList,
  args: {
    places,
    onRemove: fn(),
    emptyContent: (
      <p>
        Save a place from <a href="#nearby">Places nearby</a> to see it here.
      </p>
    ),
  },
  render: (args) => <ControlledSavedPlaces {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          "Saved-place card with supplied ordering, separate removal controls, status, and empty-state content. Storage, sorting, category recovery, retry policy, and navigation remain host-owned.",
      },
    },
  },
} satisfies Meta<typeof SavedPlacesList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Saved: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Remove Example Garden from saved places",
      }),
    );
    await expect(args.onRemove).toHaveBeenCalledWith("0");
    await expect(
      canvas.queryByRole("link", { name: /Example Garden/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: /Example Park/ }),
    ).toBeInTheDocument();
  },
};
export const Empty: Story = { args: { places: [] } };
export const StorageFailure: Story = {
  args: {
    status: (
      <div role="alert">
        Example storage unavailable.{" "}
        <Button size="sm" onClick={fn()}>
          Retry saved places
        </Button>
      </div>
    ),
  },
};
export const MissingCategory: Story = {
  args: {
    places: [
      { ...places[0], secondary: undefined, name: "Older saved example" },
    ],
  },
};
export const LongName: Story = {
  args: {
    places: [
      {
        ...places[0],
        name: "An example saved destination with a long name and additional neighborhood context",
      },
    ],
  },
};
