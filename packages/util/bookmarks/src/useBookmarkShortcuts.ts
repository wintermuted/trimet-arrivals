import { useCallback, useEffect, useState } from "react";
import { readBookmarkShortcuts, setBookmarkShortcut, subscribeBookmarkShortcuts, SHORTCUTS } from "./bookmarkShortcuts";
import type { BookmarkShortcuts, ShortcutKey } from "./bookmarkShortcuts";

const EMPTY_BOOKMARKS: Record<number, unknown> = {};

function loadShortcuts(): { shortcuts: BookmarkShortcuts; error?: string } {
  try {
    return { shortcuts: readBookmarkShortcuts() };
  } catch (error) {
    console.warn("Could not read bookmark shortcuts.", error);
    return { shortcuts: {}, error: "Could not read Home and Work shortcuts on this device." };
  }
}

export function useBookmarkShortcuts(
  stops: Record<number, unknown> = EMPTY_BOOKMARKS,
  routes: Record<number, unknown> = EMPTY_BOOKMARKS,
) {
  const [state, setState] = useState(loadShortcuts);
  const refresh = useCallback(() => setState(loadShortcuts()), []);
  useEffect(() => {
    const unsubscribe = subscribeBookmarkShortcuts(refresh);
    refresh();
    return unsubscribe;
  }, [stops, routes, refresh]);

  const setShortcut = useCallback((key: ShortcutKey, id?: number) => {
    try {
      const slot = SHORTCUTS.find(slot => slot.key === key);
      if (!slot) throw new Error("Unknown bookmark shortcut.");
      const shortcuts = setBookmarkShortcut(key, id, slot.kind === "stop" ? stops : routes);
      setState({ shortcuts });
    } catch (error) {
      console.warn("Could not save bookmark shortcut.", error);
      setState(previous => ({
        ...previous, error: "Could not save the shortcut. Check your browser storage and try again.",
      }));
    }
  }, [stops, routes]);
  return { ...state, setShortcut, refresh };
}
