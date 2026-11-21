import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@wintermuted/ui-theme/react";
import { TimeDiffBadge } from ".";

describe("arrival time badge", () => {
  const now = new Date("2026-11-21T17:00:00Z");
  const scheduled = now.getTime() + 10 * 60000;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => { jest.useRealTimers(); });

  it.each([
    [scheduled, scheduled, "10 min | On Time"],
    [scheduled + 2 * 60000, scheduled, "12 min | Late"],
    [scheduled - 2 * 60000, scheduled, "8 min | Early"],
    [undefined, scheduled, "10 min | Scheduled"],
    [scheduled, undefined, "10 min | Estimated"]
  ])("retains prediction and schedule status after extraction", (estimatedArrivalTime, scheduledArrivalTime, label) => {
    render(
      <ThemeProvider>
        <TimeDiffBadge estimatedArrivalTime={estimatedArrivalTime} scheduledArrivalTime={scheduledArrivalTime} />
      </ThemeProvider>
    );
    expect(screen.getByText(String(label))).toBeInTheDocument();
  });
});
