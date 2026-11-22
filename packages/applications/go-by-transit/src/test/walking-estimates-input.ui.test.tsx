import { vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { getWalkingEstimates } from "../api/mapbox/walking";
import { StopLocation } from "../api/trimet/interfaces/types";
import useWalkingEstimates from "../view/nearby/util/useWalkingEstimates";

vi.mock("../api/mapbox/walking");

function Example({ stops }: { stops: StopLocation[] }) {
  const walking = useWalkingEstimates([0, 0], stops, true);
  return <div>{walking.status}: {walking.error}</div>;
}

it("reports a missing stop ID without requesting walking estimates", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const stops: StopLocation[] = [{ desc: "Example", dir: "E", lat: 0, lng: 0 }];
  vi.mocked(getWalkingEstimates).mockReset();

  await act(async () => root.render(<Example stops={stops} />));
  expect(container.textContent).toContain("error: Walking estimates require valid");
  expect(getWalkingEstimates).not.toHaveBeenCalled();

  act(() => root.unmount());
  container.remove();
});
