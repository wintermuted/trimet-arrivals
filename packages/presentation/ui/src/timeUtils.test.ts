import { vi } from "vitest";
import {
  getFormattedLoadTime,
  getFormattedTime,
  getNormalizedTimeDifference,
  getTimeDifferenceInMinutes,
  getTimeUntilArrival
} from "./timeUtils";

describe("native arrival time helpers", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");

  it.each([
    [59999, 0],
    [-59999, 0],
    [60000, 1],
    [-60000, -1],
    [119999, 1],
    [-119999, -1]
  ])("truncates signed minute differences toward zero (%s)", (difference, expected) => {
    expect(getTimeDifferenceInMinutes(now + difference, now)).toBe(expected);
  });

  it.each([
    [500, "0 min"],
    [59999, "0 min"],
    [60000, "1 min"],
    [3599999, "59 min"],
    [3600000, "1 hrs"],
    [5400000, "1.5 hrs"],
    [0, "Due"],
    [-60000, "Due"]
  ])("formats countdowns using elapsed time (%s)", (difference, expected) => {
    expect(getNormalizedTimeDifference(now + difference, now)).toBe(expected);
  });

  it("measures elapsed minutes across the daylight-saving clock change", () => {
    const before = Date.parse("2026-11-01T01:30:00-07:00");
    const after = Date.parse("2026-11-01T01:30:00-08:00");
    expect(getTimeDifferenceInMinutes(after, before)).toBe(60);
    expect(getNormalizedTimeDifference(after, before)).toBe("1 hrs");
  });

  it.each([undefined, NaN, Infinity, 0, -1])("reports invalid times explicitly (%s)", time => {
    expect(getTimeDifferenceInMinutes(time, now)).toBeNull();
    expect(getTimeDifferenceInMinutes(now, time)).toBeNull();
    expect(getNormalizedTimeDifference(time, now)).toBe("Time unavailable");
    expect(getNormalizedTimeDifference(now, time)).toBe("Time unavailable");
    expect(getFormattedTime(time)).toBe("Time unavailable");
    expect(getFormattedLoadTime(time)).toBe("Time unavailable");
  });

  it("uses current time and falls back only when the estimate is unavailable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      expect(getTimeUntilArrival(now + 120000, now + 60000)).toBe("2 min");
      for (const estimate of [undefined, 0, NaN, Infinity]) {
        expect(getTimeUntilArrival(estimate, now + 60000)).toBe("1 min");
      }
      expect(getTimeUntilArrival(now - 60000, now + 60000)).toBe("Due");
      expect(getTimeUntilArrival(undefined, undefined)).toBe("Time unavailable");
    } finally {
      vi.useRealTimers();
    }
  });

  it("retains legacy local clock and load-time strings using Intl", () => {
    const time = new Date(2026, 10, 22, 13, 5, 9).getTime();
    expect(getFormattedTime(time)).toBe("1:05pm");
    expect(getFormattedLoadTime(time)).toBe("Sun, 1:05:09 pm");
  });
});
