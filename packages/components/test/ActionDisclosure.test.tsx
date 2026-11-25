import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionDisclosure, type ActionDisclosureProps } from "../src/index.js";

describe("ActionDisclosure", () => {
  it("toggles with the keyboard, retains child state, and calls collapse before hiding", async () => {
    const user = userEvent.setup();
    let panel: HTMLElement;
    const onCollapse = vi.fn(() => expect(panel.hidden).toBe(false));
    render(
      <ActionDisclosure title="Record options" onCollapse={onCollapse}>
        <input aria-label="Record name" defaultValue="Original" />
      </ActionDisclosure>,
    );
    const trigger = screen.getByRole("button", { name: "Record options" });
    panel = document.getElementById(trigger.getAttribute("aria-controls")!)!;
    await user.type(screen.getByRole("textbox"), " draft");
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(panel.hidden).toBe(true);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(panel.querySelector("input")).toHaveValue("Original draft");
    await user.keyboard(" ");
    expect(panel.hidden).toBe(false);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it("keeps actions outside the trigger, forwards refs, and opens for an action", async () => {
    const user = userEvent.setup();
    const buttonRef = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const onCollapse = vi.fn();
    const props = {
      title: "Record options",
      children: <input aria-label="Record name" />,
      defaultExpanded: false,
      headingLevel: 2,
      headingId: "record-options-title",
      onCollapse,
      action: {
        label: "Edit records",
        buttonRef,
        onClick,
        icon: <span>+</span>,
      },
    } satisfies ActionDisclosureProps;
    render(<ActionDisclosure {...props} />);
    const trigger = screen.getByRole("button", { name: "Record options" });
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls")!,
    )!;
    const action = screen.getByRole("button", { name: "Edit records" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute(
      "id",
      "record-options-title",
    );
    expect(buttonRef.current).toBe(action);
    expect(trigger.contains(action)).toBe(false);
    expect(action.closest("header")).toBe(trigger.closest("header"));
    expect(panel.hidden).toBe(true);
    await user.click(action);
    expect(panel.hidden).toBe(false);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onCollapse).not.toHaveBeenCalled();
    expect(action).toHaveAttribute("type", "button");
  });

  it("generates independent panel IDs and supports a textual action without an icon", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ActionDisclosure title="First records">
          <p>First content</p>
        </ActionDisclosure>
        <ActionDisclosure
          title="Second records"
          action={{ label: "Edit second records", onClick: vi.fn() }}
        >
          <p>Second content</p>
        </ActionDisclosure>
      </>,
    );
    const first = screen.getByRole("button", { name: "First records" });
    const second = screen.getByRole("button", { name: "Second records" });
    expect(first.getAttribute("aria-controls")).not.toBe(
      second.getAttribute("aria-controls"),
    );
    await user.click(first);
    expect(
      document.getElementById(first.getAttribute("aria-controls")!),
    ).toHaveAttribute("hidden");
    expect(
      document.getElementById(second.getAttribute("aria-controls")!),
    ).not.toHaveAttribute("hidden");
    expect(
      screen.getByRole("button", { name: "Edit second records" }),
    ).toHaveTextContent("Edit second records");
  });
});
