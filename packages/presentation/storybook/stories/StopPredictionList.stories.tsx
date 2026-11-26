import type { Meta, StoryObj } from "@storybook/react-vite";
import { StopPredictionList } from "@overworld/ui";
import { Badge } from "@wintermuted/ui-react";
import { expect, fn, userEvent, within } from "storybook/test";

const now = Date.UTC(2026, 10, 26, 20, 0);
const meta = {
  title: "Transit/Stop predictions",
  component: StopPredictionList,
  args: {
    now,
    stops: [
      {
        id: "101-1",
        name: "Example station",
        stopId: 101,
        predictionLabel: "Not reported",
        prediction: { at: now + 600000, kind: "Estimated" },
        routes: (
          <span>
            Routes <Badge>15</Badge> <Badge>20</Badge>
          </span>
        ),
      },
      {
        id: "102-2",
        name: "Example destination",
        stopId: 102,
        predictionLabel: "Not reported",
        prediction: { at: now + 1200000, kind: "Scheduled" },
      },
    ],
    updateNote: "Pacific time · Example feed updates every 30 seconds",
    onRefresh: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          "Provider-neutral stop occurrences with estimated/scheduled times, missing-time labels, last-received markers, route slots, and refresh/error/notice content. Hosts retain batching, polling, trip matching, repeated-stop ambiguity, route metadata fetching, and retry policy. Fixed sample times are not live predictions.",
      },
    },
  },
} satisfies Meta<typeof StopPredictionList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Predictions: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Refresh" }),
    );
    await expect(args.onRefresh).toHaveBeenCalled();
  },
};
export const Loading: Story = {
  args: {
    loading: true,
    stops: [
      {
        id: "101",
        name: "Example station",
        stopId: 101,
        predictionLabel: "Loading...",
      },
    ],
  },
};
export const FailedRefresh: Story = {
  args: {
    refreshLabel: "Try again",
    error:
      "Some example predictions could not be refreshed. Last received times are labeled; try again.",
    stops: [
      {
        id: "101",
        name: "Example station",
        stopId: 101,
        predictionLabel: "Unavailable",
        prediction: { at: now + 600000, kind: "Estimated" },
        stale: true,
      },
      {
        id: "102",
        name: "Example destination",
        stopId: 102,
        predictionLabel: "Unavailable",
      },
    ],
  },
};
export const RepeatedStops: Story = {
  args: {
    notices: ["Times for repeated stops cannot be matched reliably."],
    stops: [
      {
        id: "101-1",
        name: "Example loop stop",
        stopId: 101,
        predictionLabel: "Not reported",
      },
      {
        id: "101-2",
        name: "Example loop stop",
        stopId: 101,
        predictionLabel: "Not reported",
      },
    ],
  },
};
export const NextDay: Story = {
  args: {
    stops: [
      {
        id: "101",
        name: "Example station",
        stopId: 101,
        predictionLabel: "Not reported",
        prediction: { at: now + 86400000, kind: "Scheduled" },
      },
    ],
  },
};
export const NoDeparture: Story = {
  args: {
    updateNote: undefined,
    onRefresh: undefined,
    stops: [
      {
        id: "101",
        name: "Example station",
        stopId: 101,
        predictionLabel: "Select a departure",
      },
    ],
  },
};
export const Empty: Story = {
  args: { stops: [], emptyContent: <p role="status">No remaining stops.</p> },
};
