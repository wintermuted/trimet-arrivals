import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@wintermuted/ui-react";
import { TimeDiffBadge } from ".";

describe("arrival time badge", () => {
  const now = new Date("2026-11-21T17:00:00Z");
  const scheduled = now.getTime() + 10 * 60000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    [scheduled, scheduled, "10 min | On Time"],
    [scheduled + 2 * 60000, scheduled, "12 min | Late"],
    [scheduled - 2 * 60000, scheduled, "8 min | Early"],
    [undefined, scheduled, "10 min | Scheduled"],
    [scheduled, undefined, "10 min | Estimated"],
    [now.getTime(), now.getTime(), "Due | On Time"],
    [now.getTime() - 60000, now.getTime(), "Due | Early"],
    [undefined, now.getTime() - 60000, "Due | Scheduled"],
    [NaN, scheduled, "10 min | Scheduled"],
    [Infinity, scheduled, "10 min | Scheduled"],
    [undefined, undefined, "Time unavailable | Scheduled"]
  ])("retains prediction and schedule status after extraction", (estimatedArrivalTime, scheduledArrivalTime, label) => {
    render(
      <ThemeProvider>
        <TimeDiffBadge estimatedArrivalTime={estimatedArrivalTime} scheduledArrivalTime={scheduledArrivalTime} />
      </ThemeProvider>
    );
    expect(screen.getByText(String(label))).toBeInTheDocument();
  });
});
