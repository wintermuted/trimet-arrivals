import React, { createRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import {
  DeparturePicker,
  GlobalPlaceSearch,
  PlaceDetailsPanel,
  PlaceResultRow,
  SavedPlacesList,
  type PlaceResultLinkProps,
} from "../index";

function SearchHarness() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <GlobalPlaceSearch
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      hint="Use Arrow Down to browse. Escape closes search."
      scope="Example places."
      status={`Query: ${query}`}
    >
      <ul className="transit-global-search-results">
        {["Park", "Garden"].map((name) => (
          <PlaceResultRow
            key={name}
            variant="search"
            name={name}
            renderLink={(props) => <a {...props} href={`#${name}`} />}
          />
        ))}
      </ul>
    </GlobalPlaceSearch>
  );
}

it("controls search, follows result links with arrows, and restores input focus on Escape", () => {
  render(<SearchHarness />);
  const input = screen.getByRole("searchbox", { name: "Search all places" });
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "park" } });
  expect(screen.getByText("Query: park")).toBeInTheDocument();
  expect(screen.getByRole("region")).toHaveAttribute(
    "id",
    input.getAttribute("aria-controls"),
  );
  fireEvent.keyDown(input, { key: "ArrowDown" });
  const park = screen.getByRole("link", { name: "Park" }),
    garden = screen.getByRole("link", { name: "Garden" });
  expect(park).toHaveFocus();
  fireEvent.keyDown(park, { key: "ArrowDown" });
  expect(garden).toHaveFocus();
  fireEvent.keyDown(garden, { key: "ArrowUp" });
  expect(park).toHaveFocus();
  fireEvent.keyDown(park, { key: "ArrowUp" });
  expect(input).toHaveFocus();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).toHaveFocus();
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  expect(input).not.toHaveAttribute("aria-controls");
});

it("dismisses search on outside pointers and gives simultaneous search fields distinct associations", () => {
  render(
    <>
      <SearchHarness />
      <SearchHarness />
      <button>Outside</button>
    </>,
  );
  const inputs = screen.getAllByRole("searchbox");
  expect(inputs[0].id).not.toBe(inputs[1].id);
  expect(inputs[0].getAttribute("aria-describedby")).not.toBe(
    inputs[1].getAttribute("aria-describedby"),
  );
  fireEvent.focus(inputs[0]);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

it("renders supplied saved-place order, independent removal, and retained entries during storage failures", () => {
  const remove = vi.fn();
  const places = ["Zinnia Park", "Alder Garden"].map((name, index) => ({
    id: String(index),
    name,
    renderLink: (props: PlaceResultLinkProps) => (
      <a {...props} href={`#${index}`} />
    ),
  }));
  const { rerender } = render(
    <SavedPlacesList
      places={places}
      onRemove={remove}
      status={<span role="alert">Storage unavailable. Retry.</span>}
    />,
  );
  expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Zinnia Park",
    "Alder Garden",
  ]);
  const button = screen.getByRole("button", {
    name: "Remove Zinnia Park from saved places",
  });
  expect(button.closest("a")).toBeNull();
  fireEvent.click(button);
  expect(remove).toHaveBeenCalledWith("0");
  expect(screen.getByRole("alert")).toHaveTextContent("Storage unavailable");
  rerender(
    <SavedPlacesList
      places={[]}
      onRemove={remove}
      emptyContent={<p>Save a place nearby.</p>}
    />,
  );
  expect(screen.getByText("Save a place nearby.")).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("retains detail heading focus, host caveats/actions, source links, and formatted source dates", () => {
  const heading = createRef<HTMLHeadingElement>(),
    save = vi.fn();
  const { container, rerender } = render(
    <PlaceDetailsPanel
      name="Example park"
      category="Park"
      headingRef={heading}
      address="Example street"
      bookmarkAction={<button onClick={save}>Save place</button>}
      arrivalNotice="Confirm the public entrance."
      tripAction={<a href="#trip">Plan a trip here</a>}
      sourceUrl="https://example.org/source"
      website="https://example.org/venue"
      sourceDate="Nov 1, 2026"
    >
      <section aria-label="Access information">
        <p>Restricted access; check posted rules.</p>
      </section>
    </PlaceDetailsPanel>,
  );
  expect(
    container.querySelector("section").getAttribute("aria-labelledby"),
  ).toBe(heading.current.id);
  heading.current.focus();
  expect(heading.current).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Save place" }));
  expect(save).toHaveBeenCalledOnce();
  expect(
    screen.getByText("Restricted access; check posted rules."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View source location" }),
  ).toHaveAttribute("rel", "noreferrer");
  expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute(
    "href",
    "https://example.org/venue",
  );
  expect(screen.getByText(/Source data as of Nov 1, 2026/)).toBeInTheDocument();
  rerender(
    <PlaceDetailsPanel
      name="Minimal place"
      category="Place"
      arrivalNotice="Check access."
      tripAction={<a href="#trip">Plan a trip here</a>}
    />,
  );
  expect(container.querySelector(".transit-place-source")).toBeNull();
  expect(screen.queryByText("Example street")).not.toBeInTheDocument();
});

it("selects a full host departure record and retains selection by ID across refreshed records", () => {
  const departures = [
    {
      id: "estimated",
      estimated: Date.now() + 600000,
      scheduled: Date.now() + 660000,
      trip: "host-trip",
    },
    {
      id: "scheduled",
      estimated: 0,
      scheduled: Date.now() + 1200000,
      trip: "other-trip",
    },
  ];
  const select = vi.fn();
  const { rerender } = render(
    <DeparturePicker
      departures={departures}
      selectedId="estimated"
      onSelect={select}
    />,
  );
  const options = () => screen.getAllByRole("button");
  expect(options()[0]).toHaveAttribute("aria-pressed", "true");
  expect(options()[1]).toHaveTextContent("Scheduled:");
  fireEvent.click(options()[1]);
  expect(select).toHaveBeenCalledWith(departures[1]);
  rerender(
    <DeparturePicker
      departures={departures.map((item) => ({ ...item }))}
      selectedId="estimated"
      onSelect={select}
      disabled
      status={<p role="status">Refreshing departures...</p>}
    />,
  );
  expect(options()[0]).toHaveAttribute("aria-pressed", "true");
  expect(options()[1]).toBeDisabled();
  fireEvent.click(options()[1]);
  expect(select).toHaveBeenCalledOnce();
  rerender(<DeparturePicker departures={[]} onSelect={select} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "No departures available.",
  );
});
