import {
  fetchStoredTimeFormat,
  fetchStoredTimezone,
  storeTimeFormat,
  storeTimezone,
  TIME_FORMAT_KEY,
  TIMEZONE_KEY
} from "./timePreferences";

describe("time display preferences", () => {
  beforeEach(() => localStorage.clear());

  it("uses the current 12-hour and default-timezone behavior when unset or invalid", () => {
    expect(fetchStoredTimeFormat()).toBe("12h");
    expect(fetchStoredTimezone()).toBe("default");
    localStorage.setItem(TIME_FORMAT_KEY, "invalid json");
    localStorage.setItem(TIMEZONE_KEY, JSON.stringify({ timezone: "mars" }));
    expect(fetchStoredTimeFormat()).toBe("12h");
    expect(fetchStoredTimezone()).toBe("default");
  });

  it("stores only the selected preferences and leaves unrelated storage intact", () => {
    localStorage.setItem("BOOKMARKS", JSON.stringify({ saved: true }));
    expect(storeTimeFormat("24h")).toBe(true);
    expect(storeTimezone("utc")).toBe(true);
    expect(fetchStoredTimeFormat()).toBe("24h");
    expect(fetchStoredTimezone()).toBe("utc");
    expect(localStorage.getItem("BOOKMARKS")).toBe(
      JSON.stringify({ saved: true })
    );
    storeTimezone("default");
    expect(fetchStoredTimezone()).toBe("default");
  });

  it("reports blocked writes instead of failing the time display", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });
    expect(storeTimeFormat("24h")).toBe(false);
    setItem.mockRestore();
    expect(fetchStoredTimeFormat()).toBe("12h");
  });
});
