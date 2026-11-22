import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import Modal from "./Modal";

describe("shared transit dialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders without a special portal root and preserves the close callback", () => {
    const onClose = vi.fn();
    act(() =>
      root.render(
        <Modal onClose={onClose}>
          <p>Route details</p>
        </Modal>
      )
    );

    const dialog = document.querySelector("dialog");
    expect(dialog.textContent).toContain("Route Info");
    expect(dialog.textContent).toContain("Route details");
    act(() => dialog.querySelector("button").click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("removes its dialog when unmounted", () => {
    act(() =>
      root.render(
        <Modal onClose={vi.fn()}>
          <p>Route details</p>
        </Modal>
      )
    );
    act(() => root.render(null));
    expect(document.querySelector("dialog")).toBeNull();
  });
});
