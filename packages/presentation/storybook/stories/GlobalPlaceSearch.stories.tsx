import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  GlobalPlaceSearch,
  PlaceResultRow,
  type GlobalPlaceSearchProps,
} from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

function ControlledSearch(args: GlobalPlaceSearchProps) {
  const [query, setQuery] = useState(args.query),
    [open, setOpen] = useState(args.open);
  useEffect(() => setQuery(args.query), [args.query]);
  useEffect(() => setOpen(args.open), [args.open]);
  return (
    <GlobalPlaceSearch
      {...args}
      query={query}
      open={open}
      onQueryChange={(value) => {
        args.onQueryChange(value);
        setQuery(value);
      }}
      onOpenChange={(value) => {
        args.onOpenChange(value);
        setOpen(value);
      }}
    />
  );
}
const meta = {
  title: "Places/Global search",
  component: GlobalPlaceSearch,
  args: {
    query: "Example",
    open: true,
    onQueryChange: fn(),
    onOpenChange: fn(),
    hint: "Use Arrow Down or Tab to browse results. Escape closes search.",
    scope: "Example catalog only. Map filters stay unchanged.",
    status: "Showing 2 of 2 example places.",
    children: (
      <ul className="transit-global-search-results">
        {["Example Park", "Example Garden"].map((name) => (
          <PlaceResultRow
            key={name}
            variant="search"
            name={name}
            secondary="Example address"
            renderLink={(props) => <a {...props} href="#example-place" />}
          />
        ))}
      </ul>
    ),
  },
  render: (args) => <ControlledSearch {...args} />,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 448, minHeight: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Controlled search field and results popover, with outside-pointer dismissal, Arrow key navigation, and Escape focus restoration. The host supplies matching, highlighted results, loading/error copy, pagination, geography, and route-change dismissal.",
      },
    },
  },
} satisfies Meta<typeof GlobalPlaceSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      input = canvas.getByRole("searchbox");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      canvas.getByRole("link", { name: /Example Park/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      canvas.getByRole("link", { name: /Example Garden/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveFocus();
    await expect(canvas.queryByRole("region")).not.toBeInTheDocument();
    await userEvent.click(input);
  },
};
export const Closed: Story = { args: { open: false, query: "" } };
export const Loading: Story = {
  args: {
    children: undefined,
    status: "Loading the example catalog...",
    loadStatus: <span role="status">Loading...</span>,
  },
};
const retry = fn();
export const PartialFailure: Story = {
  args: {
    loadStatus: (
      <Button size="sm" variant="secondary" onClick={retry}>
        Retry unavailable categories
      </Button>
    ),
    status: "Showing 2 example places from the loaded categories.",
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Retry unavailable categories",
      }),
    );
    await expect(retry).toHaveBeenCalled();
  },
};
export const Empty: Story = {
  args: {
    children: undefined,
    status: "No example places match. Try another name.",
  },
};
export const MoreResults: Story = {
  args: {
    status: "Showing 2 of 12 example places.",
    moreAction: (
      <Button className="transit-global-search-more" onClick={fn()}>
        Show more places (10 remaining)
      </Button>
    ),
  },
};
