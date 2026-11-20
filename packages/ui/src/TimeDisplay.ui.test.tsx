import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { TimeDisplayProvider, TimeDisplaySettings, useTimeDisplay } from "@trimet-arrivals/ui";

function Example() {
  const { formatTime } = useTimeDisplay();
  return (
    <>
      <TimeDisplaySettings />
      <output>{formatTime(Date.UTC(2024, 0, 15, 20, 5))}</output>
    </>
  );
}

describe("time display settings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("updates visible times and persists selected clock and timezone", () => {
    act(() => {
      root.render(
        <TimeDisplayProvider>
          <Example />
        </TimeDisplayProvider>
      );
    });
    const [format, timezone] = Array.from(container.querySelectorAll("select"));
    expect(container.textContent).toContain("12-hour");

    act(() => {
      format.value = "24h";
      format.dispatchEvent(new Event("change", { bubbles: true }));
      timezone.value = "utc";
      timezone.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.querySelector("output").textContent).toBe("20:05");
    expect(JSON.parse(localStorage.getItem("TIME_FORMAT"))).toEqual({
      format: "24h"
    });
    expect(JSON.parse(localStorage.getItem("TIMEZONE"))).toEqual({
      timezone: "utc"
    });
  });
});
