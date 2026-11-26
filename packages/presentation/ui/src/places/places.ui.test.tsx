import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import {
  GroupedPlaceCategoryFilters,
  MapReferenceLayerControls,
  PlaceResultRow,
  SourceProvenancePanel,
  type PlaceCategoryGroup,
} from "../index";

it("keeps result navigation and the separate action independent in every row layout", () => {
  const navigate = vi.fn(),
    remove = vi.fn();
  const { rerender } = render(
    <ul>
      <PlaceResultRow
        name="Example Park"
        secondary="Park"
        renderLink={(props) => (
          <a
            {...props}
            href="/places/example"
            onClick={(event) => {
              event.preventDefault();
              navigate();
            }}
          />
        )}
        action={<button onClick={remove}>Remove</button>}
      />
    </ul>,
  );
  const link = screen.getByRole("link", { name: /^Example Park/ });
  expect(link).toHaveAttribute("href", "/places/example");
  expect(link.querySelector("button")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(remove).toHaveBeenCalledOnce();
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(link);
  expect(navigate).toHaveBeenCalledOnce();
  rerender(
    <ul>
      <PlaceResultRow
        variant="search"
        name={
          <>
            <mark>Example</mark> Park
          </>
        }
        secondary="Park / Example Street"
        trailing={<span>100 m straight-line</span>}
        renderLink={(props) => <a {...props} href="/places/example" />}
      />
    </ul>,
  );
  expect(screen.getByRole("link").querySelector("mark")).toHaveTextContent(
    "Example",
  );
  expect(screen.getByText("100 m straight-line")).toBeInTheDocument();
  rerender(
    <ul>
      <PlaceResultRow
        variant="saved"
        name="Unknown saved place"
        renderLink={(props) => <a {...props} href="/places/missing" />}
      />
    </ul>,
  );
  expect(
    screen
      .getByRole("link", { name: "Unknown saved place" })
      .querySelector("small"),
  ).toBeNull();
});

const groups: PlaceCategoryGroup[] = [
  {
    id: "nature",
    label: "Parks & nature",
    categories: [
      { id: "park", label: "Parks" },
      { id: "garden", label: "Gardens" },
    ],
  },
  { id: "food", label: "Food", categories: [{ id: "cafe", label: "Cafés" }] },
];

it("derives mixed state and sends only changed category values, independently of expansion", () => {
  const onSelectionChange = vi.fn();
  function Harness() {
    const [selected, setSelected] = useState({
      park: true,
      garden: false,
      cafe: true,
    });
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    return (
      <GroupedPlaceCategoryFilters
        groups={groups}
        selected={selected}
        onSelectionChange={(changes) => {
          onSelectionChange(changes);
          setSelected((previous) => ({ ...previous, ...changes }));
        }}
        expandedGroups={expandedGroups}
        onExpandedGroupsChange={setExpandedGroups}
      />
    );
  }
  render(<Harness />);
  const bulk = screen.getByRole<HTMLInputElement>("checkbox", {
    name: "Toggle all parks & nature",
  });
  expect(bulk.indeterminate).toBe(true);
  const expand = screen.getByRole("button", { name: "Parks & nature" });
  fireEvent.click(expand);
  expect(expand).toHaveAttribute("aria-expanded", "true");
  expect(onSelectionChange).not.toHaveBeenCalled();
  fireEvent.click(bulk);
  expect(onSelectionChange).toHaveBeenLastCalledWith({
    park: true,
    garden: true,
  });
  expect(bulk.indeterminate).toBe(false);
  expect(screen.getByRole("checkbox", { name: "Gardens" })).toBeChecked();
  fireEvent.click(screen.getByRole("checkbox", { name: "Gardens" }));
  expect(onSelectionChange).toHaveBeenLastCalledWith({ garden: false });
  expect(bulk.indeterminate).toBe(true);
});

it("gives each filter instance its own disclosure target and disables empty groups", () => {
  const props = {
    groups: [{ id: "empty", label: "Empty group", categories: [] }],
    selected: {},
    onSelectionChange: vi.fn(),
    expandedGroups: [],
    onExpandedGroupsChange: vi.fn(),
  };
  render(
    <>
      <GroupedPlaceCategoryFilters {...props} />
      <GroupedPlaceCategoryFilters {...props} />
    </>,
  );
  const buttons = screen.getAllByRole("button", { name: "Empty group" });
  expect(buttons[0].getAttribute("aria-controls")).not.toBe(
    buttons[1].getAttribute("aria-controls"),
  );
  for (const button of buttons) {
    expect(
      document.getElementById(button.getAttribute("aria-controls")),
    ).toHaveAttribute("hidden");
  }
  for (const checkbox of screen.getAllByRole("checkbox", {
    name: "Toggle all empty group",
  })) {
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  }
});

it("keeps layer help and retry outside the toggle and renders dependent controls only when selected", () => {
  const onChange = vi.fn(),
    onRetry = vi.fn(),
    onHelp = vi.fn();
  const layer = {
    id: "trails",
    label: "Park trails",
    checked: false,
    onChange,
    swatch: { kind: "line" as const, color: "#123456", dashed: true },
    help: <button onClick={onHelp}>About park trails</button>,
    status: <button onClick={onRetry}>Retry park trails</button>,
    children: (
      <label>
        <input type="checkbox" defaultChecked />
        Show polygons
      </label>
    ),
  };
  const { rerender } = render(<MapReferenceLayerControls layers={[layer]} />);
  const help = screen.getByRole("button", { name: "About park trails" });
  expect(help.closest("label")).toBeNull();
  fireEvent.click(help);
  fireEvent.click(screen.getByRole("button", { name: "Retry park trails" }));
  expect(onHelp).toHaveBeenCalledOnce();
  expect(onRetry).toHaveBeenCalledOnce();
  expect(onChange).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("checkbox", { name: "Show polygons" }),
  ).not.toBeInTheDocument();
  const checkbox = screen.getByRole("checkbox", { name: "Park trails" });
  expect(
    checkbox.closest("label").querySelector(".transit-place-line-swatch"),
  ).toHaveStyle({ borderTopStyle: "dashed", borderColor: "#123456" });
  fireEvent.click(checkbox);
  expect(onChange).toHaveBeenCalledWith(true);
  rerender(
    <MapReferenceLayerControls layers={[{ ...layer, checked: true }]} />,
  );
  expect(screen.getByRole("checkbox", { name: "Show polygons" })).toBeChecked();
});

it("preserves source attribution, formatted dates, coverage, and the supplied notice position", () => {
  const record = {
    id: "park",
    label: "Parks",
    source: "Example source",
    sourceUrl: "https://example.org/data",
    license: "Example license",
    licenseUrl: "https://example.org/license",
    retrievedDate: "Nov 18, 2026",
    updatedDate: "Nov 1, 2026",
    coverage: "Example coverage.",
  };
  const { container, rerender } = render(
    <SourceProvenancePanel
      description={<p>Snapshots are not live listings.</p>}
      sources={[record, { ...record, id: "garden", label: "Gardens" }]}
      notice={<p>Regional attribution.</p>}
      noticeAfter={1}
    />,
  );
  const paragraphs = Array.from(container.querySelectorAll("details > p")).map(
    (p) => p.textContent,
  );
  expect(paragraphs[0]).toBe("Snapshots are not live listings.");
  expect(paragraphs[1]).toContain(
    "Retrieved Nov 18, 2026. Source data as of Nov 1, 2026. Example coverage.",
  );
  expect(paragraphs[2]).toBe("Regional attribution.");
  expect(paragraphs[3]).toContain("Gardens");
  const source = container.querySelector('a[href="https://example.org/data"]');
  expect(source).toHaveTextContent("Example source");
  expect(source).toHaveAttribute("rel", "noreferrer");
  expect(
    container.querySelector('a[href="https://example.org/license"]'),
  ).toHaveTextContent("Example license");
  rerender(
    <SourceProvenancePanel
      sources={[]}
      notice={<p>No snapshots loaded.</p>}
      noticeAfter={1}
    />,
  );
  expect(screen.getByText("No snapshots loaded.")).toBeInTheDocument();
  expect(container.querySelectorAll("a")).toHaveLength(0);
});
