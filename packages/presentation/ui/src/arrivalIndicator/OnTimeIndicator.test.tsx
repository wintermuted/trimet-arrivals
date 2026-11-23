import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import React from "react";
import { OnTimeIndicator } from "..";

it("renders nothing without scheduled and estimated times", () => {
  const { container } = render(<OnTimeIndicator scheduled={undefined} estimated={undefined} />);
  expect(container).toBeEmptyDOMElement();
});

it.each([
  [1000, 1000, "On time"],
  [4000, 1000, "3s early"],
  [1000, 4000, "3s late"]
])("shows the arrival status rather than a child component name", (scheduled, estimated, expected) => {
  render(<OnTimeIndicator scheduled={scheduled} estimated={estimated} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});

it("includes on-time success styling without the arrivals table stylesheet", () => {
  render(<OnTimeIndicator scheduled={1000} estimated={1000} />);
  const indicator = screen.getByText("On time");
  const style = document.createElement("style");
  style.textContent = readFileSync(join(__dirname, "Indicator.css"), "utf8");
  document.head.append(style);
  try {
    if (!style.sheet) throw new Error("Indicator stylesheet did not load");
    const rule = Array.from(style.sheet.cssRules)
      .filter((item): item is CSSStyleRule => item instanceof CSSStyleRule)
      .find(item => indicator.matches(item.selectorText));
    expect(rule?.style.getPropertyValue("color")).toBe("var(--wm-color-success)");
  } finally {
    style.remove();
  }
});

it.each([NaN, Infinity, 0])("does not classify invalid timestamps (%s)", time => {
  const { container } = render(<OnTimeIndicator scheduled={time} estimated={time} />);
  expect(container).toBeEmptyDOMElement();
});
