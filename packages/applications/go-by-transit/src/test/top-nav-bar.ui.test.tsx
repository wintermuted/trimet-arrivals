import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TopNavBar } from "../view/nearby/components/common/TopNavBar";

it("keeps the route and destination together in the header", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <TopNavBar id="54 Example Route" subtitle="To Example Destination" />
        </MemoryRouter>,
      ),
    );
    const heading = container.querySelector("header .transit-detail-heading");
    expect(heading.querySelector("h3").textContent).toBe("54 Example Route");
    expect(heading.querySelector("p").textContent).toBe(
      "To Example Destination",
    );
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

it.each([undefined, "/nearby/stops"])(
  "places an accessible back caret before the title and navigates to %s",
  async (backTo) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <MemoryRouter initialEntries={["/detail"]}>
            <Routes>
              <Route
                path="/detail"
                element={
                  <TopNavBar id="54" shortSign="Portland" backTo={backTo} />
                }
              />
              <Route
                path={backTo || "/nearby/simple-routes"}
                element={<p>Returned</p>}
              />
            </Routes>
          </MemoryRouter>,
        ),
      );
      const header = container.querySelector("header");
      const back = header.querySelector("a");
      expect(header.firstElementChild).toBe(back);
      expect(back.getAttribute("aria-label")).toBe("Back");
      expect(
        back.querySelector('.fa-caret-left[aria-hidden="true"]'),
      ).not.toBeNull();
      expect(back.textContent).toBe("");
      expect(header.querySelector("h3").textContent).toBe("54 to Portland");
      await act(async () => back.click());
      expect(container.textContent).toBe("Returned");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  },
);

it("uses a native back action when no destination is supplied", () => {
  const onBack = vi.fn();
  render(<TopNavBar id="Choose a destination" onBack={onBack} />);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(onBack).toHaveBeenCalledOnce();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("does not run the back callback on modified link clicks", () => {
  const onBack = vi.fn();
  render(
    <MemoryRouter>
      <TopNavBar id="Stop 101" backTo="/nearby/stops" onBack={onBack} />
    </MemoryRouter>,
  );
  const back = screen.getByRole("link", { name: "Back" });
  fireEvent.click(back, { ctrlKey: true });
  expect(onBack).not.toHaveBeenCalled();
  fireEvent.click(back);
  expect(onBack).toHaveBeenCalledOnce();
});
