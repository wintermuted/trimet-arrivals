import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailHeader } from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import { expect, fn, userEvent, within } from "storybook/test";

const meta = {
  title: "Navigation/Detail header",
  component: DetailHeader,
  args: { title: "54 Example Route", onBack: fn() },
  parameters: {
    docs: {
      description: {
        component:
          "Router-free detail heading with optional subtitle and action. Supply onBack for a button or renderBack for a host-owned link; no destination is inferred.",
      },
    },
  },
} satisfies Meta<typeof DetailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Back" }),
    );
    await expect(args.onBack).toHaveBeenCalled();
  },
};
export const WithSubtitleAndAction: Story = {
  args: {
    subtitle: "To Example Destination",
    action: <Button onClick={fn()}>Route details</Button>,
  },
};
export const NarrowTruncatedTitle: Story = {
  args: {
    title: "A long example stop name at a busy intersection",
    subtitle: "Stop 101",
    truncateTitle: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(100%, 280px)" }}>
        <Story />
      </div>
    ),
  ],
};
export const HostNavigation: Story = {
  args: {
    onBack: undefined,
    renderBack: (props) => <a {...props} href="#example-stop-list" />,
  },
};
export const WithoutBackControl: Story = {
  args: { onBack: undefined },
};
