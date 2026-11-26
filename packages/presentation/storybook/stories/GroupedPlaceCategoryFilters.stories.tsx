import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  GroupedPlaceCategoryFilters,
  type GroupedPlaceCategoryFiltersProps,
} from "@overworld/ui";
import { useEffect, useState } from "react";
import FontAwesome from "react-fontawesome";
import { expect, fn, userEvent, within } from "storybook/test";

function ControlledFilters(args: GroupedPlaceCategoryFiltersProps) {
  const [selected, setSelected] = useState(args.selected);
  const [expanded, setExpanded] = useState(args.expandedGroups);
  useEffect(() => setSelected(args.selected), [args.selected]);
  useEffect(() => setExpanded(args.expandedGroups), [args.expandedGroups]);
  return (
    <GroupedPlaceCategoryFilters
      {...args}
      selected={selected}
      expandedGroups={expanded}
      onSelectionChange={(changes) => {
        args.onSelectionChange(changes);
        setSelected((previous) => ({ ...previous, ...changes }));
      }}
      onExpandedGroupsChange={(groups) => {
        args.onExpandedGroupsChange(groups);
        setExpanded(groups);
      }}
    />
  );
}

const meta = {
  title: "Places/Grouped category filters",
  component: GroupedPlaceCategoryFilters,
  args: {
    groups: [
      {
        id: "nature",
        label: "Parks & nature",
        icon: (
          <FontAwesome
            name="tree"
            aria-hidden="true"
            className="transit-places-group-icon"
          />
        ),
        categories: [
          { id: "park", label: "Parks" },
          { id: "garden", label: "Gardens" },
        ],
      },
      {
        id: "food",
        label: "Food & markets",
        icon: (
          <FontAwesome
            name="shopping-basket"
            aria-hidden="true"
            className="transit-places-group-icon"
          />
        ),
        categories: [{ id: "cafe", label: "Cafés" }],
      },
    ],
    selected: { park: true, garden: false, cafe: true },
    expandedGroups: [],
    onSelectionChange: fn(),
    onExpandedGroupsChange: fn(),
  },
  render: (args) => <ControlledFilters {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          "Controlled groups with bulk/mixed selection, independent disclosures, and unique target IDs. Selection callbacks send changed category values only; host filters, category definitions, icons, and feed status remain outside.",
      },
    },
  },
} satisfies Meta<typeof GroupedPlaceCategoryFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bulk = canvas.getByRole("checkbox", {
      name: "Toggle all parks & nature",
    });
    await expect(bulk).toHaveProperty("indeterminate", true);
    await userEvent.click(
      canvas.getByRole("button", { name: "Parks & nature" }),
    );
    await userEvent.click(bulk);
    await expect(
      canvas.getByRole("checkbox", { name: "Gardens" }),
    ).toBeChecked();
    await expect(bulk).toHaveProperty("indeterminate", false);
    await userEvent.click(canvas.getByRole("checkbox", { name: "Gardens" }));
    await expect(bulk).toHaveProperty("indeterminate", true);
  },
};
export const ExpandedAllSelected: Story = {
  args: {
    selected: { park: true, garden: true, cafe: true },
    expandedGroups: ["nature", "food"],
  },
};
export const LoadingGroup: Story = {
  args: {
    groups: [
      {
        id: "nature",
        label: "Parks & nature",
        status: <span role="status">Loading parks...</span>,
        categories: [
          {
            id: "park",
            label: "Parks",
            status: <span role="status">Loading...</span>,
          },
        ],
      },
    ],
  },
};
export const EmptyGroup: Story = {
  args: {
    groups: [{ id: "empty", label: "No categories loaded", categories: [] }],
    selected: {},
  },
};
