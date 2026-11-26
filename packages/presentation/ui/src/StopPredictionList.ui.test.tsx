import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { StopPredictionList, type StopPredictionItem } from "./index";

const now = Date.parse("2026-11-15T20:00:00Z");
const stops: StopPredictionItem[] = [
  {
    id: "101-1",
    name: "Example station",
    stopId: 101,
    predictionLabel: "Not reported",
    prediction: { at: now + 60000, kind: "Estimated" },
    stale: true,
    routes: <span>Route 15</span>,
  },
  {
    id: "102-2",
    name: "Example destination",
    stopId: 102,
    predictionLabel: "Unavailable",
  },
  {
    id: "101-3",
    name: "Example station",
    stopId: 101,
    predictionLabel: "Not reported",
  },
];

it("retains stop occurrences, supplied missing-time labels and routes, and marks only retained times stale", () => {
  const { container } = render(<StopPredictionList stops={stops} now={now} />);
  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(3);
  expect(rows[0]).toHaveTextContent("Example station (101)");
  expect(rows[0]).toHaveTextContent("Estimated · Last received");
  expect(rows[0]).toHaveTextContent("Route 15");
  expect(rows[1]).toHaveTextContent("Unavailable");
  expect(rows[2]).toHaveTextContent("Not reported");
  expect(container.querySelectorAll("time")).toHaveLength(1);
  expect(container.querySelector("time")).toHaveAttribute(
    "datetime",
    new Date(now + 60000).toISOString(),
  );
});

it("shows refresh/loading/error/caveat content without discarding rows and distinguishes next-day schedules", () => {
  const refresh = vi.fn();
  const { rerender } = render(
    <StopPredictionList
      now={now}
      stops={[
        {
          ...stops[0],
          stale: false,
          prediction: { at: now + 86400000, kind: "Scheduled" },
        },
      ]}
      updateNote="Example feed updates every 30 seconds"
      onRefresh={refresh}
      refreshLabel="Try again"
      loading
      error="Example predictions could not be refreshed."
      notices={["Times for repeated stops cannot be matched reliably."]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refresh).toHaveBeenCalledOnce();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading stop predictions",
  );
  expect(screen.getByRole("alert")).toHaveTextContent("could not be refreshed");
  expect(screen.getByRole("listitem")).toHaveTextContent("Nov 16");
  expect(screen.getByRole("listitem")).toHaveTextContent("Scheduled");
  expect(screen.getByRole("listitem")).not.toHaveTextContent("Last received");
  expect(
    screen.getByText("Times for repeated stops cannot be matched reliably."),
  ).toBeInTheDocument();
  rerender(
    <StopPredictionList
      stops={[]}
      emptyContent={<p role="status">No remaining stops.</p>}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("No remaining stops.");
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
