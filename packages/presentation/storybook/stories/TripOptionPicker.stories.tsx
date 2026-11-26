import type { Meta, StoryObj } from "@storybook/react-vite";
import { TripOptionPicker, type TripOptionPickerProps } from "@overworld/ui";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

function ControlledPicker(args: TripOptionPickerProps) {
  const [selected, setSelected] = useState(args.selectedIndex),
    [editing, setEditing] = useState(args.editing);
  useEffect(() => setSelected(args.selectedIndex), [args.selectedIndex]);
  useEffect(() => setEditing(args.editing), [args.editing]);
  return (
    <TripOptionPicker
      {...args}
      selectedIndex={selected}
      editing={editing}
      onSelect={(index) => {
        args.onSelect(index);
        setSelected(index);
        setEditing(false);
      }}
      onEdit={() => {
        args.onEdit?.();
        setEditing(true);
      }}
      onCancel={() => {
        args.onCancel?.();
        setEditing(false);
      }}
    />
  );
}
const meta = {
  title: "Journeys/Trip option picker",
  component: TripOptionPicker,
  args: {
    selectedIndex: -1,
    editing: false,
    onSelect: fn(),
    onEdit: fn(),
    onCancel: fn(),
    onHover: fn(),
    onFocus: fn(),
    onCollapse: fn(),
    transitColor: () => "var(--wm-color-accent)",
    itineraries: [
      {
        id: "example-1",
        startTime: "12:00 PM",
        endTime: "12:30 PM",
        duration: 30,
        distance: 1.25,
        fare: 2.8,
        numberOfTransfers: 0,
        partial: false,
        legs: [
          { mode: "Walk", partial: false },
          {
            mode: "Bus",
            route: { number: "15", name: "Example route" },
            partial: false,
          },
        ],
      },
      {
        id: "example-2",
        startTime: "12:10 PM",
        endTime: "12:45 PM",
        duration: 35,
        numberOfTransfers: 1,
        partial: false,
        legs: [
          { mode: "Bus", route: { number: "20" }, partial: false },
          {
            mode: "Light Rail",
            route: { name: "Example line" },
            partial: false,
          },
        ],
      },
    ],
  },
  render: (args) => <ControlledPicker {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          "Controlled trip comparison, confirmed summary, editing/cancel actions, focus refs, and mouse/keyboard preview callbacks. Reuses shared option summaries and disclosure controls. Touch does not trigger hover previews. The host retains selection, preview cleanup, URL/map integration, and fetching. Example data only.",
      },
    },
  },
} satisfies Meta<typeof TripOptionPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AvailableTrips: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      list = canvas.getByRole("list", { name: "Available trips" });
    await userEvent.click(within(list).getAllByRole("button")[1]);
    await expect(args.onSelect).toHaveBeenCalledWith(1);
    await expect(
      canvas.getByRole("heading", { name: /Option 2/ }),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Edit trip" }));
    await expect(
      canvas.getByRole("list", { name: "Available trips" }),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(
      canvas.queryByRole("list", { name: "Available trips" }),
    ).not.toBeInTheDocument();
  },
};
export const Confirmed: Story = { args: { selectedIndex: 0 } };
export const Editing: Story = { args: { selectedIndex: 0, editing: true } };
export const PartialDetails: Story = {
  args: { itineraries: [{ id: "partial", partial: true, legs: [] }] },
};
export const LongRoute: Story = {
  args: {
    itineraries: [
      {
        id: "long",
        partial: false,
        startTime: "12:00 PM",
        endTime: "12:45 PM",
        duration: 45,
        legs: [
          {
            mode: "Bus",
            partial: false,
            route: {
              name: "A long example route name with neighborhood and destination context",
            },
          },
        ],
      },
    ],
  },
};
export const Empty: Story = { args: { itineraries: [] } };
