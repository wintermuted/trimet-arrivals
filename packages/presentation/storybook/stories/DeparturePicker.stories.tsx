import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeparturePicker, type DeparturePickerProps } from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

const time = Date.UTC(2026, 10, 26, 20, 30);
function ControlledDepartures(args: DeparturePickerProps) {
  const [selected, setSelected] = useState(args.selectedId);
  useEffect(() => setSelected(args.selectedId), [args.selectedId]);
  return (
    <DeparturePicker
      {...args}
      selectedId={selected}
      onSelect={(departure) => {
        args.onSelect(departure);
        setSelected(departure.id);
      }}
    />
  );
}
const meta = {
  title: "Transit/Departure picker",
  component: DeparturePicker,
  args: {
    departures: [
      { id: "estimated", estimated: time, scheduled: time + 60000 },
      { id: "scheduled", estimated: 0, scheduled: time + 600000 },
    ],
    selectedId: "estimated",
    onSelect: fn(),
  },
  render: (args) => <ControlledDepartures {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          "Controlled departure selection by stable ID, using shared time preferences and countdown badges. Records require only ID and epoch-millisecond estimated/scheduled times; callbacks retain any additional host fields. Fetching, filtering, refresh policy, and trip integration stay outside. Fixed sample times are not a live departure feed.",
      },
    },
  },
} satisfies Meta<typeof DeparturePicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Departures: Story = {
  play: async ({ canvasElement, args }) => {
    const options = within(canvasElement).getAllByRole("button");
    await userEvent.click(options[1]);
    await expect(options[1]).toHaveAttribute("aria-pressed", "true");
    await expect(options[0]).toHaveAttribute("aria-pressed", "false");
    await expect(args.onSelect).toHaveBeenCalledWith(args.departures[1]);
  },
};
export const Empty: Story = { args: { departures: [] } };
export const Refreshing: Story = {
  args: {
    disabled: true,
    status: <p role="status">Refreshing example departures...</p>,
  },
};
export const FailedRefresh: Story = {
  args: {
    status: (
      <div role="alert">
        Example refresh failed. Previous departures remain visible.{" "}
        <Button size="sm" onClick={fn()}>
          Retry departures
        </Button>
      </div>
    ),
  },
};
