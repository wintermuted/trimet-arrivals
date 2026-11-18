export const BOOKMARK_SHORTCUTS = "BOOKMARK_SHORTCUTS_V1";

export const SHORTCUTS = [
  { key: "home_location", label: "Home stop", kind: "stop" },
  { key: "work_location", label: "Work stop", kind: "stop" },
  { key: "home_commute", label: "Home commute", kind: "route" },
  { key: "work_commute", label: "Work commute", kind: "route" }
] as const;

export type ShortcutKey = typeof SHORTCUTS[number]["key"];
export type BookmarkShortcuts = Partial<Record<ShortcutKey, number>>;

function isBookmarkId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function readBookmarkShortcuts(): BookmarkShortcuts {
  const stored: unknown = JSON.parse(localStorage.getItem(BOOKMARK_SHORTCUTS) ?? "{}");
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    throw new Error("Invalid bookmark shortcuts");
  }
  const shortcuts: BookmarkShortcuts = {};
  for (const { key } of SHORTCUTS) {
    const id = (stored as Record<string, unknown>)[key];
    if (isBookmarkId(id)) shortcuts[key] = id;
  }
  return shortcuts;
}

export function readAvailableBookmarkShortcuts(): BookmarkShortcuts {
  try {
    return readBookmarkShortcuts();
  } catch (error) {
    console.warn("Could not read bookmark shortcuts.", error);
    return {};
  }
}

export function setBookmarkShortcut(
  key: ShortcutKey,
  id: number | undefined,
  bookmarks: Record<number, unknown>
): BookmarkShortcuts {
  if (id !== undefined && (!isBookmarkId(id) || !bookmarks[id])) {
    throw new Error("Choose an existing bookmark.");
  }
  const shortcuts = readBookmarkShortcuts();
  if (id === undefined) delete shortcuts[key];
  else shortcuts[key] = id;
  localStorage.setItem(BOOKMARK_SHORTCUTS, JSON.stringify(shortcuts));
  return shortcuts;
}

export function removeShortcutsForBookmark(kind: "stop" | "route", id: number) {
  try {
    const shortcuts = readBookmarkShortcuts();
    const matches = SHORTCUTS.filter(slot => slot.kind === kind && shortcuts[slot.key] === id);
    if (matches.length === 0) return;
    for (const { key } of matches) delete shortcuts[key];
    localStorage.setItem(BOOKMARK_SHORTCUTS, JSON.stringify(shortcuts));
  } catch (error) {
    console.warn("Could not remove shortcut for deleted bookmark.", error);
  }
}
