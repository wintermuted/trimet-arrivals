import type { Meta, StoryObj } from "@storybook/react-vite";
import { WalkingDistance } from "@overworld/ui";

const meta = {
  title: "Journeys/Walking distance",
  component: WalkingDistance,
  args: {
    enabled: true,
    straightLine: "200 m",
    estimate: { status: "ready", meters: 250, seconds: 180 },
    formatDistance: (meters: number) => `${Math.round(meters)} m`,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Presents an injected walking result and straight-line fallback. The host fetches routes and chooses distance units; the formatter receives meters.",
      },
    },
  },
} satisfies Meta<typeof WalkingDistance>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const UnderOneMinute: Story = {
  args: { estimate: { status: "ready", meters: 30, seconds: 40 } },
};
export const Calculating: Story = {
  args: { estimate: undefined, loading: true },
};
export const Unreachable: Story = {
  args: { estimate: { status: "unreachable" } },
};
export const Uncertain: Story = {
  args: { estimate: { status: "uncertain" } },
};
export const Unavailable: Story = {
  args: { estimate: undefined },
};
export const StraightLineOnly: Story = {
  args: { enabled: false },
};
export const RefreshingWithPreviousResult: Story = {
  args: { loading: true },
};
