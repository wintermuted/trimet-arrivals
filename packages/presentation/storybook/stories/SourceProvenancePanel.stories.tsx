import type { Meta, StoryObj } from "@storybook/react-vite";
import { SourceProvenancePanel } from "@overworld/ui";
import { expect, userEvent, within } from "storybook/test";

const sample = {
  id: "parks",
  label: "Example parks",
  source: "Example catalog",
  sourceUrl: "https://example.org/data",
  license: "Example license",
  licenseUrl: "https://example.org/license",
  retrievedDate: "Nov 18, 2026",
  updatedDate: "Nov 1, 2026",
  coverage: "Illustrative sample coverage.",
};
const meta = {
  title: "Places/Source provenance",
  component: SourceProvenancePanel,
  args: {
    sources: [sample],
    description: <p>Snapshots are not live listings. Example data only.</p>,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Source/license attribution, host-formatted retrieval/update dates, and coverage in a native disclosure. The host supplies caveats and snapshot metadata. Optional noticeAfter preserves a notice's position among source records.",
      },
    },
  },
} satisfies Meta<typeof SourceProvenancePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Snapshot: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Data sources and coverage"));
    await expect(
      canvas.getByRole("link", { name: "Example catalog" }),
    ).toHaveAttribute("href", sample.sourceUrl);
    await expect(canvas.getByText(/Retrieved Nov 18, 2026/)).toBeVisible();
  },
};
export const MultipleSourcesAndNotice: Story = {
  args: {
    sources: [
      {
        ...sample,
        id: "context",
        label: "Example context layer",
        updatedDate: undefined,
        coverage:
          "1,234 mapped features; only tiles intersecting this map area load. Illustrative coverage.",
      },
      sample,
    ],
    noticeAfter: 1,
    notice: <p>Illustrative regional attribution notice.</p>,
  },
};
export const NoSnapshotsLoaded: Story = {
  args: {
    sources: [],
    notice: <p>No source snapshots have been loaded yet.</p>,
  },
};
export const LongSourceName: Story = {
  args: {
    sources: [
      {
        ...sample,
        source:
          "An unusually long example catalog name with detailed regional coverage information",
      },
    ],
  },
};
