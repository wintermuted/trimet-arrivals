import { render, screen } from "@testing-library/react";
import { WalkingDistance } from "./WalkingDistance";

it.each([
  [100, "328 ft walk"],
  [1609.344, "1.0 mi walk"],
])(
  "preserves the app's imperial formatting for %s meters",
  (meters, distance) => {
    render(
      <WalkingDistance
        enabled
        estimate={{ status: "ready", meters, seconds: 120 }}
        straightLine="300 ft"
      />,
    );
    expect(screen.getByText(distance)).toBeInTheDocument();
    expect(screen.getByText("About 2 min")).toBeInTheDocument();
  },
);
