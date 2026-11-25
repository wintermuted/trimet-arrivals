import { vi } from "vitest";
import { createRef } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { TripPlannerItinerary } from "@overworld/trimet-client";
import { ItineraryDetails, JourneyDirections, PlannerDisclosure, TripOptionSummary } from "../journeys";

const itinerary: TripPlannerItinerary = {
  partial: true, startTime: "10:00 am", endTime: "10:30 am", duration: 30, numberOfTransfers: 0,
  legs: [
    { mode: "Walk", from: { description: "Home" }, to: { description: "Station" }, partial: false },
    { mode: "Bus", route: { number: "15" }, direction: "Downtown", partial: false,
      from: { stopId: 101, description: "Station" }, to: { stopId: 202, description: "Central" } },
  ],
};

describe("router-free journey presentation", () => {
  it("adapts the published disclosure without losing edit refs, mounted fields, or cleanup timing", () => {
    const editRef = createRef<HTMLButtonElement>();
    const edit = vi.fn();
    const collapse = vi.fn(() => expect(panel).not.toHaveAttribute("hidden"));
    render(<PlannerDisclosure title="Plan a trip" headingId="planner-heading"
      onCollapse={collapse} edit={{ label: "Edit stops", buttonRef: editRef, onClick: edit }}>
      <input aria-label="From" defaultValue="Central" />
    </PlannerDisclosure>);
    const trigger = screen.getByRole("button", { name: "Plan a trip" });
    const panel = document.getElementById(trigger.getAttribute("aria-controls"));
    expect(trigger).toHaveClass("wm-action-disclosure-trigger");
    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute("id", "planner-heading");
    expect(editRef.current).toBe(screen.getByRole("button", { name: "Edit stops" }));
    fireEvent.change(screen.getByRole("textbox", { name: "From" }), { target: { value: "Home" } });
    fireEvent.click(trigger);
    expect(collapse).toHaveBeenCalledTimes(1);
    expect(panel).toHaveAttribute("hidden");
    fireEvent.click(editRef.current);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(panel).not.toHaveAttribute("hidden");
    expect(screen.getByRole("textbox", { name: "From" })).toHaveValue("Home");
  });

  it("renders planned directions with supplied transit colors, stop semantics, and focusable headings", () => {
    const heading = createRef<HTMLHeadingElement>();
    const { container } = render(<JourneyDirections itinerary={itinerary} headingRef={heading} transitColor={() => "#123456"} />);
    expect(screen.getByText("Planned times from TriMet, not live updates.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Journey steps" })).getByText("Board at")).toBeInTheDocument();
    expect(screen.getByText("Central (202)")).toBeInTheDocument();
    expect(container.querySelector('[data-icon="bus"]')).toHaveStyle({ color: "#123456" });
    expect(heading.current).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("forwards keyboard highlights and clears them when collapsing without forwarding touch hover", () => {
    const hover = vi.fn(), focus = vi.fn();
    const { container } = render(<ItineraryDetails itinerary={itinerary} index={0}
      highlight={{ leg: 1, onHover: hover, onFocus: focus }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Some details were missing");
    const leg = container.querySelector(".transit-planner-leg--highlighted");
    fireEvent.focus(leg);
    expect(focus).toHaveBeenCalledWith(1);
    const touch = new Event("pointerover", { bubbles: true });
    Object.defineProperty(touch, "pointerType", { value: "touch" });
    fireEvent(leg, touch);
    expect(hover).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Directions" }));
    expect(hover).toHaveBeenCalledWith();
    expect(focus).toHaveBeenLastCalledWith();
    expect(screen.getByRole("button", { name: "Directions" })).toHaveAttribute("aria-expanded", "false");
  });

  it("retains leg order and explicit incomplete-data text in option summaries", () => {
    const { container, rerender } = render(<TripOptionSummary itinerary={itinerary} index={1} current transitColor={() => "#123456"} />);
    expect([...container.querySelectorAll(".transit-planner-option-leg > span")].map(node => node.textContent)).toEqual(["Walk", "Bus 15"]);
    expect(screen.getByText(/Option 2/)).toHaveTextContent("0 transfers · Current trip");
    rerender(<TripOptionSummary itinerary={{ partial: true, legs: [] }} index={0} current={false} />);
    expect(screen.getByText("Times unavailable")).toBeInTheDocument();
    expect(screen.getByText("Route details unavailable")).toBeInTheDocument();
  });
});
