import type { Meta, StoryObj } from "@storybook/react-vite";
import type { StopCatalog } from "@overworld/trimet-client";
import { StopSearch } from "@overworld/ui/search";
import { Button } from "@wintermuted/ui-react";
import { expect, fireEvent, fn, waitFor, within } from "storybook/test";

const catalog: StopCatalog = {
  stops: [101, 102, 103, 104, 105, 106, 107].map(locid => ({
    locid,
    desc: `Example Central Station ${locid}`,
    aliases: ["Transit hub"],
    dir: "E",
    lat: 45.5,
    lng: -122.5,
    seq: 1,
    tp: false
  })),
  routeCount: 1,
  directionCount: 1,
  stopReferenceCount: 7,
  incompleteRouteCount: 0,
  incompleteDirectionCount: 0,
  incompleteRouteNames: [],
  invalidStopCount: 0
};

const meta = {
  title: "Search/Stop search",
  component: StopSearch,
  args: {
    catalog,
    loading: false,
    error: false,
    onRetry: fn(),
    renderStopLinks: stop => (
      <Button type="button" variant="secondary" size="sm">
        Choose stop {stop.locid}
      </Button>
    )
  },
  argTypes: {
    onRetry: { control: false },
    renderStopLinks: { control: false }
  },
  parameters: {
    docs: {
      description: {
        component:
          "Search an injected sample catalog. Result actions are inert examples; fetching and navigation belong to the host application."
      }
    }
  }
} satisfies Meta<typeof StopSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MatchingStops: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(
      canvas.getByRole("searchbox", { name: "Stop name or ID" }),
      { target: { value: "Central" } }
    );
    await expect(await canvas.findAllByRole("listitem")).toHaveLength(6);
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Showing 6 of 7 matches"
    );
  }
};
export const NoMatches: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(
      canvas.getByRole("searchbox", { name: "Stop name or ID" }),
      { target: { value: "Missing" } }
    );
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("No stops match")
    );
  }
};
export const Loading: Story = {
  args: { catalog: undefined, loading: true }
};
export const FailedLoad: Story = {
  args: { catalog: undefined, error: true }
};
export const PartialCatalog: Story = {
  args: { catalog: { ...catalog, incompleteRouteCount: 1 } }
};
