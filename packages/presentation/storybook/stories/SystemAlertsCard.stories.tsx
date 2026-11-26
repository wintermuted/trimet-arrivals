import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Alert } from "@overworld/trimet-client";
import { SystemAlertsCard } from "@overworld/ui/alerts";
import { expect, fn, userEvent, within } from "storybook/test";

const notice: Alert = {
  id: 1,
  begin: Date.UTC(2026, 0, 15, 17),
  end: 0,
  header_text: "Example service notice",
  desc: "Sample alert content for reviewing product presentation.",
  system_wide_flag: true,
  info_link_url: "",
  route: [],
  location: []
};

const meta = {
  title: "Alerts/System alerts",
  component: SystemAlertsCard,
  args: {
    systemAlertsData: [notice],
    loading: false,
    error: false,
    onRefresh: fn(),
    loadingContent: <p role="status">Loading system alerts...</p>
  },
  argTypes: {
    onRefresh: { control: false },
    loadingContent: { control: false }
  },
  parameters: {
    docs: {
      description: {
        component:
          "Injected sample feed; no service requests. Review initial load, empty receipt, failed load, and stale-data refresh failures."
      }
    }
  }
} satisfies Meta<typeof SystemAlertsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithNotice: Story = {};
export const Empty: Story = { args: { systemAlertsData: [] } };
export const Loading: Story = {
  args: { systemAlertsData: undefined, loading: true }
};
export const Refreshing: Story = { args: { loading: true } };
export const FailedLoad: Story = {
  args: { systemAlertsData: undefined, error: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(args.onRefresh).toHaveBeenCalledOnce();
  }
};
export const FailedRefresh: Story = { args: { error: true } };
