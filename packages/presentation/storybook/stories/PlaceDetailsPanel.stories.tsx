import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookmarkToggle, PlaceDetailsPanel } from "@overworld/ui";
import { Button } from "@wintermuted/ui-react";
import { fn } from "storybook/test";

const meta = {
  title: "Places/Details panel",
  component: PlaceDetailsPanel,
  args: {
    name: "Example Park",
    category: "Park",
    address: "Example Avenue",
    arrivalNotice:
      "Approximate map location, not a verified public entrance. Confirm your arrival point before finding trips.",
    tripAction: (
      <a className="wm-btn wm-btn-primary" href="#example-trip">
        Plan a trip here
      </a>
    ),
    sourceUrl: "https://example.org/source",
    website: "https://example.org/venue",
    sourceDate: "Nov 1, 2026",
    bookmarkAction: (
      <BookmarkToggle
        isBookmarked={false}
        showLabel
        bookmarkLabel="Save place"
        removeLabel="Remove saved place"
        onClick={fn()}
      />
    ),
    children: (
      <section aria-label="Example access information">
        <h3>Source-listed access</h3>
        <p>
          Example data only. Confirm public access, hours, and visiting
          arrangements before traveling.
        </p>
      </section>
    ),
  },
  parameters: {
    docs: {
      description: {
        component:
          "Accessible detail heading, address, bookmark/status slots, host-authored category information and caveats, trip action, and external source links. Maps, focus policy, category definitions, formatted source dates, and navigation stay with the host.",
      },
    },
  },
} satisfies Meta<typeof PlaceDetailsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Destination: Story = {};
export const Minimal: Story = {
  args: {
    address: undefined,
    bookmarkAction: undefined,
    website: undefined,
    sourceDate: undefined,
    children: undefined,
  },
};
export const SourceFailure: Story = {
  args: {
    status: (
      <div role="alert">
        Example source unavailable.{" "}
        <Button size="sm" onClick={fn()}>
          Retry source
        </Button>
      </div>
    ),
  },
};
export const LongContent: Story = {
  args: {
    name: "A long example destination name with neighborhood and site context",
    address:
      "An unusually long example address, building, public entrance, and neighborhood description",
  },
};
