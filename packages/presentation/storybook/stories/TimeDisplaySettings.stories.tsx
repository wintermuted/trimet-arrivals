import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimeDisplaySettings } from "@overworld/ui";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "Time/Display settings",
  component: TimeDisplaySettings,
  parameters: {
    docs: {
      description: {
        component:
          "Uses TimeDisplayProvider from the global preview. Preferences persist on the Storybook origin, separately from the app."
      }
    }
  }
} satisfies Meta<typeof TimeDisplaySettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Choose24HourUtc: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const clock = canvas.getByRole("combobox", { name: "Clock" });
    const timezone = canvas.getByRole("combobox", { name: "Timezone" });
    await userEvent.selectOptions(clock, "24h");
    await userEvent.selectOptions(timezone, "utc");
    await waitFor(() => {
      expect(clock).toHaveValue("24h");
      expect(timezone).toHaveValue("utc");
    });
  }
};
