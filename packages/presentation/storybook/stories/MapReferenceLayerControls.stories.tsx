import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  MapReferenceLayerControls,
  type MapReferenceLayerControlsProps,
} from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

function ControlledLayers(args: MapReferenceLayerControlsProps) {
  const [layers, setLayers] = useState(args.layers);
  useEffect(() => setLayers(args.layers), [args.layers]);
  return (
    <MapReferenceLayerControls
      {...args}
      layers={layers.map((layer) => ({
        ...layer,
        onChange: (checked) => {
          layer.onChange(checked);
          setLayers((previous) =>
            previous.map((item) =>
              item.id === layer.id ? { ...item, checked } : item,
            ),
          );
        },
      }))}
    />
  );
}

const meta = {
  title: "Places/Reference layer controls",
  component: MapReferenceLayerControls,
  args: {
    layers: [
      {
        id: "trails",
        label: "Example trails",
        checked: true,
        onChange: fn(),
        swatch: { kind: "line", color: "var(--wm-color-accent)", dashed: true },
        help: (
          <details style={{ position: "relative" }}>
            <summary aria-label="About example trails">Help</summary>
            <p
              style={{
                position: "absolute",
                insetInlineEnd: 0,
                zIndex: 1,
                width: "min(240px, calc(100vw - 32px))",
                padding: "var(--wm-space-2)",
                background: "var(--wm-color-surface)",
                border: "1px solid var(--wm-color-border)",
              }}
            >
              Reference lines, not turn-by-turn routes.
            </p>
          </details>
        ),
      },
      {
        id: "crossings",
        label: "Example crossings",
        checked: false,
        onChange: fn(),
        swatch: { kind: "point", color: "var(--wm-color-text-muted)" },
      },
    ],
  },
  render: (args) => <ControlledLayers {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          "Controlled visibility rows with line/point legends and separate host-supplied help and feed status. Map ownership, requests, legend colors, and warnings remain host-owned. Dependent controls appear only when the parent is selected.",
      },
    },
  },
} satisfies Meta<typeof MapReferenceLayerControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LineAndPointLegends: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Example crossings" }),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Example crossings" }),
    ).toBeChecked();
    await userEvent.click(canvas.getByLabelText("About example trails"));
    await expect(
      canvas.getByText("Reference lines, not turn-by-turn routes."),
    ).toBeVisible();
    await expect(
      canvas.getByRole("checkbox", { name: "Example trails" }),
    ).toBeChecked();
    await userEvent.click(canvas.getByLabelText("About example trails"));
  },
};
const retry = fn();
export const FailedWithRetry: Story = {
  args: {
    layers: [
      {
        id: "trails",
        label: "Example trails",
        checked: true,
        onChange: fn(),
        status: (
          <Button
            size="sm"
            variant="ghost"
            onClick={retry}
            aria-label="Retry example trails"
          >
            Retry
          </Button>
        ),
        children: (
          <p role="alert">
            Could not refresh. Previously received lines remain visible.
          </p>
        ),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Retry example trails",
      }),
    );
    await expect(retry).toHaveBeenCalled();
  },
};
export const Loading: Story = {
  args: {
    layers: [
      {
        id: "trails",
        label: "Example trails",
        checked: true,
        onChange: fn(),
        status: <span role="status">Loading...</span>,
      },
    ],
  },
};
export const DependentPolygonControl: Story = {
  args: {
    layers: [
      {
        id: "neighborhoods",
        label: "Example neighborhoods",
        checked: true,
        onChange: fn(),
        swatch: {
          kind: "point",
          color: "var(--wm-color-accent)",
          square: true,
        },
        children: (
          <label className="transit-places-category transit-places-polygon-toggle">
            <input type="checkbox" defaultChecked />
            Show polygons
          </label>
        ),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("checkbox", { name: "Show polygons" }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Example neighborhoods" }),
    );
    await expect(
      canvas.queryByRole("checkbox", { name: "Show polygons" }),
    ).toBeNull();
  },
};
