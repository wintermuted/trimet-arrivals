import { render, screen } from "@testing-library/react";
import { RouteIndicator, RouteDescription, FrequentServiceIndicator, StopLocationIndicator } from "../transit";

describe("router-free transit presentation", () => {
  it("shows bus numbers and supplied rail labels without introducing links", () => {
    const { rerender } = render(<RouteIndicator routeId={15} verbose />);
    expect(screen.getByText("15 Bus")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    rerender(<RouteIndicator routeId={90} routeLabel="Red" />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.queryByText("90 Bus")).not.toBeInTheDocument();
    rerender(<RouteIndicator routeId={0} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("preserves description text, stop badge and conditional frequent-service indicator", () => {
    const { rerender } = render(<>
      <RouteDescription description="<Example Route>" />
      <StopLocationIndicator locationId={101} />
      <FrequentServiceIndicator frequentService={false} />
    </>);
    expect(screen.getByText("<Example Route>")).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.queryByText(/Frequent/)).not.toBeInTheDocument();
    rerender(<FrequentServiceIndicator frequentService small />);
    expect(screen.getByText(/Frequent/)).toHaveClass("frequent-service-indicator", "small");
  });
});
