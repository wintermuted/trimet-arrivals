import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimeToArrivalIndicator } from "@overworld/ui";

const now = Date.UTC(2026, 0, 15, 17);
const meta = {
  title: "Time/Arrival countdown",
  component: TimeToArrivalIndicator,
  args: { now, estimated: now + 330_000 }
} satisfies Meta<typeof TimeToArrivalIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Upcoming: Story = {};
export const SecondsAway: Story = { args: { estimated: now + 30_000 } };
export const Due: Story = { args: { estimated: now } };
export const PastArrival: Story = { args: { estimated: now - 60_000 } };
export const OverAnHour: Story = { args: { estimated: now + 3_900_000 } };
export const MissingEstimate: Story = { args: { estimated: 0 } };
