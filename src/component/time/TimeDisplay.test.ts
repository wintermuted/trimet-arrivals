import {
  formatDisplayDate,
  formatDisplayDay,
  formatDisplayTime
} from "./TimeDisplay";

describe("time display formatting", () => {
  it("preserves local 12-hour output unless the user selects another format", () => {
    expect(formatDisplayTime(
      Date.UTC(2024, 0, 15, 20, 5),
      "12h",
      "default",
      "America/Los_Angeles"
    )).toBe("12:05 PM");
    expect(formatDisplayTime(
      Date.UTC(2024, 0, 15, 20, 5),
      "24h",
      "utc"
    )).toBe("20:05");
  });

  it("formats DST transitions as instants in the selected timezone", () => {
    const beforeJump = Date.UTC(2024, 2, 10, 9, 30);
    const afterJump = Date.UTC(2024, 2, 10, 10, 30);
    expect(formatDisplayTime(
      beforeJump,
      "24h",
      "default",
      "America/Los_Angeles"
    )).toBe("01:30");
    expect(formatDisplayTime(
      afterJump,
      "24h",
      "default",
      "America/Los_Angeles"
    )).toBe("03:30");
  });

  it("uses the chosen timezone for date-boundary labels", () => {
    const timestamp = Date.UTC(2024, 0, 1, 0, 30);
    expect(formatDisplayDay(timestamp, "default", "America/Los_Angeles"))
      .toBe("Sun, Dec 31");
    expect(formatDisplayDay(timestamp, "utc")).toBe("Mon, Jan 1");
    expect(formatDisplayDate(timestamp, "default", "America/Los_Angeles"))
      .toBe("12/31/23");
    expect(formatDisplayDate(timestamp, "utc")).toBe("01/01/24");
  });
});
