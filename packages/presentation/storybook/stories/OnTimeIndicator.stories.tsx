import type { Meta, StoryObj } from "@storybook/react-vite";
import { OnTimeIndicator } from "@overworld/ui";

const scheduled = Date.UTC(2026, 0, 15, 17);
const meta = {
  title: "Time/On-time indicator",
  component: OnTimeIndicator,
  args: { scheduled, estimated: scheduled },
  parameters: {
    docs: {
      description: {
        component:
          "Compares supplied epoch-millisecond timestamps. Examples use a fixed clock, not a live feed."
      }
    }
  }
} satisfies Meta<typeof OnTimeIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTime: Story = {};
export const Early: Story = { args: { estimated: scheduled - 120_000 } };
export const Late: Story = { args: { estimated: scheduled + 180_000 } };
export const MissingEstimate: Story = { args: { estimated: 0 } };
