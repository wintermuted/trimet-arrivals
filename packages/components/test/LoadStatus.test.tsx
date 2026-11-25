import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoadStatus, type LoadStatusProps } from "../src/index.js";

const labels = { retry: "Retry records", loading: "Loading records" };

describe("LoadStatus", () => {
  it("renders nothing when idle and distinguishes loading from failures", () => {
    const { container, rerender } = render(
      <LoadStatus issues={[]} labels={labels} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<LoadStatus issues={[]} loading labels={labels} />);
    expect(
      screen.getByRole("status", { name: labels.loading }),
    ).toHaveTextContent(labels.loading);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(
      <LoadStatus
        issues={[{ message: "Records unavailable" }]}
        labels={labels}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Records unavailable");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("announces warnings while loading and disables aggregate retry during failure recovery", async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <LoadStatus
        issues={[]}
        warnings={["Some records are missing"]}
        loading
        labels={labels}
      />,
    );
    expect(screen.getByText("Some records are missing")).toHaveAttribute(
      "role",
      "status",
    );
    expect(
      screen.getByRole("status", { name: labels.loading }),
    ).toBeInTheDocument();

    rerender(
      <LoadStatus
        issues={[{ message: "Records unavailable", retry }]}
        loading
        labels={labels}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: labels.retry }));
    expect(retry).not.toHaveBeenCalled();
  });

  it("calls each supplied retry once and isolates clicks and keyboard events from its container", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const outerClick = vi.fn();
    const outerKey = vi.fn();
    render(
      <div onClick={outerClick} onKeyDown={outerKey}>
        <LoadStatus
          issues={[
            { message: "First unavailable", retry: first },
            { message: "Read-only source unavailable" },
            { message: "Second unavailable", retry: second },
          ]}
          labels={labels}
        />
      </div>,
    );
    const button = screen.getByRole("button", { name: labels.retry });
    await userEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(outerClick).not.toHaveBeenCalled();
    expect(outerKey).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "First unavailable Read-only source unavailable Second unavailable",
    );
  });

  it("supplies exact message and tone to help without owning positioning or domain policy", () => {
    const props = {
      issues: [{ message: "Records unavailable" }],
      warnings: ["Some records are missing"],
      labels,
      renderHelp: ({ message, tone }) => (
        <button aria-label={`About ${tone}`} title={message}>
          ?
        </button>
      ),
    } satisfies LoadStatusProps;
    const { rerender } = render(<LoadStatus {...props} />);
    expect(screen.getByRole("alert")).toHaveClass("wm-sr-only");
    expect(screen.getByRole("button", { name: "About error" })).toHaveAttribute(
      "title",
      "Records unavailable Some records are missing",
    );
    rerender(<LoadStatus {...props} issues={[]} />);
    expect(
      screen.getByRole("button", { name: "About warning" }),
    ).toHaveAttribute("title", "Some records are missing");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps simultaneous instances and caller-supplied icons independent", async () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <>
        <LoadStatus
          issues={[{ message: "One unavailable", retry: first }]}
          labels={{ retry: "Retry one", loading: "Loading one" }}
          retryIcon={<span aria-hidden>!</span>}
        />
        <LoadStatus
          issues={[{ message: "Two unavailable", retry: second }]}
          labels={{ retry: "Retry two", loading: "Loading two" }}
        />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry one" }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
});
