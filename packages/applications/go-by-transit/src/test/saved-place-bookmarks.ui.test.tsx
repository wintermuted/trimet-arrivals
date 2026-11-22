import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { readSavedPlaces, SAVED_PLACES_KEY } from "@overworld/places/savedPlaces";
import BookmarksViewComponent from "../view/bookmarks/component/BookmarksViewComponent";

vi.mock("../view/bookmarks/component/BookmarkedStops", () => ({ default: () => <div>Existing stop bookmarks</div> }));
vi.mock("../view/bookmarks/container/BookmarkedRoutesContainer", () => ({ default: () => <div>Existing route bookmarks</div> }));
vi.mock("../view/bookmarks/component/BookmarkShortcutsEditor", () => ({ default: () => <div>Existing shortcuts</div> }));
vi.mock("../view/bookmarks/container/BookmarkSectionsContainer", () => ({ default: () => <div>Existing collections</div> }));

const park = { id: "portland:park:1", name: "Alpha Park" };
const skatepark = { id: "osm:skatepark:way:142991279", name: "Burnside Skatepark" };

function Location() {
  return <output>{useLocation().pathname}</output>;
}

describe("saved places on Bookmarks", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function render() {
    act(() => root.render(<MemoryRouter basename="/transit" initialEntries={["/transit/bookmarks"]}>
      <BookmarksViewComponent bookmarks={[]} /><Location />
    </MemoryRouter>));
  }

  it("shows stored names and category icons alongside existing bookmarks, with basename-aware detail links", () => {
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([skatepark, park]));
    render();
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>(".bookmark-places-list a"));
    expect(links.map(link => link.querySelector("strong").textContent)).toEqual([park.name, skatepark.name]);
    expect(links[0].querySelector("svg").getAttribute("data-icon")).toBe("tree");
    expect(links[0].querySelector("small").textContent).toBe("Parks");
    expect(links[1].getAttribute("href")).toBe("/transit/nearby/places/osm%3Askatepark%3Away%3A142991279");
    for (const section of ["Existing stop bookmarks", "Existing route bookmarks", "Existing shortcuts", "Existing collections"]) {
      expect(container.textContent).toContain(section);
    }
    act(() => links[1].click());
    expect(container.querySelector("output").textContent).toBe("/nearby/places/osm%3Askatepark%3Away%3A142991279");
  });

  it("removes a save persistently without deleting other saves, and receives cross-tab changes", () => {
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([park, skatepark]));
    render();
    act(() => container.querySelector<HTMLButtonElement>(`button[aria-label="Remove ${park.name} from saved places"]`).click());
    expect(readSavedPlaces()).toEqual({ [skatepark.id]: skatepark.name });
    expect(container.querySelectorAll(".bookmark-places-list li")).toHaveLength(1);
    act(() => root.render(null));
    render();
    expect(container.querySelector(".bookmark-places-list strong").textContent).toBe(skatepark.name);
    localStorage.setItem(SAVED_PLACES_KEY, "[]");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: SAVED_PLACES_KEY })));
    expect(container.querySelector(".bookmark-places-list")).toBeNull();
    expect(container.textContent).toContain("Save a place from Places nearby to see it here.");
    expect(container.querySelector<HTMLAnchorElement>('a[href="/transit/nearby/places"]')).not.toBeNull();
  });

  it("reports unreadable storage inline without an empty-state claim, and retries without overwriting saves", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(SAVED_PLACES_KEY, "{invalid");
    render();
    expect(container.querySelector('[role="alert"]').textContent).toContain("Saved places could not be read");
    expect(container.textContent).not.toContain("Save a place from");
    expect(localStorage.getItem(SAVED_PLACES_KEY)).toBe("{invalid");
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([skatepark]));
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry saved places"]').click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector(".bookmark-places-list strong").textContent).toBe(skatepark.name);
  });

  it("retains the saved row and shows the retry indicator when removal cannot be persisted", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([skatepark]));
    render();
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    act(() => container.querySelector<HTMLButtonElement>(`button[aria-label="Remove ${skatepark.name} from saved places"]`).click());
    expect(container.querySelector('[role="alert"]').textContent).toContain("Your changes were not saved");
    expect(container.querySelector(".bookmark-places-list strong").textContent).toBe(skatepark.name);
    write.mockRestore();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry saved places"]').click());
    act(() => container.querySelector<HTMLButtonElement>(`button[aria-label="Remove ${skatepark.name} from saved places"]`).click());
    expect(readSavedPlaces()).toEqual({});
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
