import type { Meta, StoryObj } from "@storybook/react-vite";
import { RouteIndicator } from "@overworld/ui/transit";

const meta = {
  title: "Transit/Route indicator",
  component: RouteIndicator,
  args: { routeId: 15, verbose: false },
  parameters: {
    docs: {
      description: {
        component:
          "Router-free route badge. Applications supply rail labels and own navigation."
      }
    }
  }
} satisfies Meta<typeof RouteIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bus: Story = {};
export const VerboseBus: Story = { args: { verbose: true } };
export const Rail: Story = {
  args: { routeId: 90, routeLabel: "MAX Red Line" }
};
export const MissingRoute: Story = { args: { routeId: 0 } };
