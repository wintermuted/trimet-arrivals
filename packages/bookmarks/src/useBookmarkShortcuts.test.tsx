import { act, renderHook } from "@testing-library/react";
import { useBookmarkShortcuts } from "./react";
import { BOOKMARK_SHORTCUTS, removeShortcutsForBookmark, setBookmarkShortcut } from "./bookmarkShortcuts";

const stops = { 101: { desc: "Saved stop" } };

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

it("synchronizes same-tab assignments and bookmark deletion between consumers", () => {
  const first = renderHook(() => useBookmarkShortcuts(stops));
  const second = renderHook(() => useBookmarkShortcuts(stops));
  act(() => first.result.current.setShortcut("home_location", 101));
  expect(second.result.current.shortcuts).toEqual({ home_location: 101 });
  act(() => removeShortcutsForBookmark("stop", 101));
  expect(first.result.current.shortcuts).toEqual({});
  expect(second.result.current.shortcuts).toEqual({});
});

it("refreshes relevant cross-tab changes and storage clears, and removes subscriptions on unmount", () => {
  const remove = jest.spyOn(window, "removeEventListener");
  const hook = renderHook(() => useBookmarkShortcuts(stops));
  localStorage.setItem(BOOKMARK_SHORTCUTS, JSON.stringify({ work_location: 101 }));
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" })));
  expect(hook.result.current.shortcuts).toEqual({});
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: BOOKMARK_SHORTCUTS })));
  expect(hook.result.current.shortcuts).toEqual({ work_location: 101 });
  localStorage.clear();
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
  expect(hook.result.current.shortcuts).toEqual({});
  hook.unmount();
  expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  expect(remove).toHaveBeenCalledWith("trimet-bookmark-shortcuts-changed", expect.any(Function));
});

it("reports read and write failures, recovers on refresh, and retains other consumers after failed saves", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem(BOOKMARK_SHORTCUTS, "{");
  const first = renderHook(() => useBookmarkShortcuts(stops));
  expect(first.result.current.error).toContain("Could not read");
  localStorage.setItem(BOOKMARK_SHORTCUTS, "{}");
  act(() => first.result.current.refresh());
  expect(first.result.current.error).toBeUndefined();
  act(() => setBookmarkShortcut("home_location", 101, stops));
  const second = renderHook(() => useBookmarkShortcuts(stops));
  const dispatch = jest.spyOn(window, "dispatchEvent");
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
  act(() => first.result.current.setShortcut("home_location"));
  expect(first.result.current.error).toContain("Could not save");
  expect(first.result.current.shortcuts).toEqual({ home_location: 101 });
  expect(second.result.current.shortcuts).toEqual({ home_location: 101 });
  expect(second.result.current.error).toBeUndefined();
  expect(dispatch).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith("Could not save bookmark shortcut.", expect.any(Error));
});
