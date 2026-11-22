import { fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@wintermuted/ui-theme/react";
import type { StopCatalogStop } from "@overworld/trimet-client";
import { PlannerStopSelect } from "../transit";

const stop = (locid: number, desc: string, aliases: string[] = []): StopCatalogStop => ({
  locid, desc, aliases, lat: 45.52, lng: -122.67, dir: "N", seq: 1, tp: false,
});

describe("router-free planner stop picker", () => {
  it("uses injected common-place aliases only for verified catalog stops and deduplicates saved groups", () => {
    const station = stop(101, "NE Example Station");
    const change = jest.fn();
    render(<ThemeProvider><label htmlFor="picker">Destination</label><PlannerStopSelect
      id="picker" stops={[station]} loading={false} onChange={change}
      savedStops={[{ id: 101, label: "Home" }, { id: 101, label: "Work" }]}
      commonPlaces={[
        { id: 101, label: "Example Airport", aliases: ["EXA"] },
        { id: 999, label: "Unverified Airport", aliases: ["EXA"] },
      ]}
    /></ThemeProvider>);
    fireEvent.change(screen.getByRole("combobox", { name: "Destination" }), { target: { value: "EXA" } });
    expect(screen.getByText("Saved stops")).toBeInTheDocument();
    expect(screen.queryByText("Common places")).not.toBeInTheDocument();
    const option = screen.getByRole("option");
    expect(option).toHaveTextContent("Home / Work: Example Airport (101)");
    fireEvent.click(option);
    expect(change).toHaveBeenCalledWith(station, expect.objectContaining({ action: "select-option" }));
  });

  it("prioritizes exact IDs within capped quadrant groups and retains route and mode labels", () => {
    const stops = Array.from({ length: 25 }, (_, i) => stop(100 + i, `NW Example ${i}`));
    stops.push({
      ...stop(999, "NW Central", ["NW Main"]),
      modes: ["Bus"], routes: [{ id: 2, label: "FX2-Division", color: "#123456" }],
    });
    render(<ThemeProvider><label htmlFor="picker">Origin</label><PlannerStopSelect
      id="picker" stops={stops} loading={false} onChange={jest.fn()}
    /></ThemeProvider>);
    const input = screen.getByRole("combobox", { name: "Origin" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")).toHaveLength(20);
    fireEvent.change(input, { target: { value: "999" } });
    const option = screen.getByRole("option");
    expect(option).toHaveTextContent("NW Central (999)");
    expect(within(option).getByText("Bus")).toBeInTheDocument();
    expect(within(option).getByText("FX2-Division")).toHaveStyle({ borderColor: "#123456" });
  });

  it("keeps ambiguous aliases in Other stops and disables an empty catalog", () => {
    const { rerender } = render(<ThemeProvider><label htmlFor="picker">Origin</label><PlannerStopSelect
      id="picker" stops={[stop(101, "NE Central", ["SW Central"])]}
      loading={false} onChange={jest.fn()}
    /></ThemeProvider>);
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Origin" }), { key: "ArrowDown" });
    expect(screen.getByText("Other stops")).toBeInTheDocument();
    rerender(<ThemeProvider><label htmlFor="picker">Origin</label><PlannerStopSelect
      id="picker" stops={[]} loading onChange={jest.fn()}
    /></ThemeProvider>);
    expect(screen.getByLabelText("Origin")).toBeDisabled();
  });
});
