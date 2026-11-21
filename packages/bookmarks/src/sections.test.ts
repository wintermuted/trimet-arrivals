import {
  fetchStoredBookmarkSections,
  removeAllStoredBookmarksInSection,
  removeStoredBookmarkFromSection,
  removeStoredBookmarkSection,
  storeBookmarkSection,
  updateStoredBookmarkSection,
  updateStoredBookmarkSectionName
} from "./sections";

beforeEach(() => localStorage.clear());

it("edits legacy saved sections in place without rewriting route groups", () => {
  localStorage.setItem("BOOKMARK_SECTIONS", '{"1":{"name":"Commute","order":1,"bookmarkedStops":[123,456]}}');
  const routeGroups = '{"1":[75]}';
  localStorage.setItem("ROUTE_BOOKMARK_GROUPS_V1", routeGroups);

  updateStoredBookmarkSection(1, 456);
  updateStoredBookmarkSection(1, 789);
  removeStoredBookmarkFromSection(1, 123);
  updateStoredBookmarkSectionName(1, "Weekdays");

  expect(JSON.parse(localStorage.getItem("BOOKMARK_SECTIONS")!)).toEqual({
    1: { name: "Weekdays", order: 1, bookmarkedStops: [456, 789] }
  });
  expect(localStorage.getItem("ROUTE_BOOKMARK_GROUPS_V1")).toBe(routeGroups);
});

it("creates sections on empty storage and clears a section without deleting it", () => {
  expect(fetchStoredBookmarkSections()).toEqual({});
  storeBookmarkSection(1, { bookmarkedStops: [123], name: "Commute", order: 1 });
  storeBookmarkSection(2, { bookmarkedStops: [456], name: "Weekend", order: 2 });
  removeAllStoredBookmarksInSection(1);
  removeStoredBookmarkSection(2);

  expect(fetchStoredBookmarkSections()).toEqual({
    1: { name: "Commute", order: 1, bookmarkedStops: [] }
  });
});
