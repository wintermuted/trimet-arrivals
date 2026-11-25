import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RefreshAction, type RefreshActionProps } from "../src/index.js";

const labels = {
  idle: "Update records",
  loading: "Updating records",
  retry: "Retry records",
};

describe("RefreshAction", () => {
  it("prioritizes loading over retry and does not invoke a disabled action", async () => {
    const onRefresh = vi.fn();
    const props = {
      loading: true,
      error: true,
      onRefresh,
      labels,
    } satisfies RefreshActionProps;
    const { rerender } = render(<RefreshAction {...props} />);
    const button = screen.getByRole("button", { name: labels.loading });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onRefresh).not.toHaveBeenCalled();

    rerender(<RefreshAction {...props} loading={false} />);
    await userEvent.click(screen.getByRole("button", { name: labels.retry }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
  });

  it("preserves caller button props and passes the click event without submitting a form", async () => {
    const onRefresh = vi.fn();
    const submit = vi.fn();
    const buttonRef = createRef<HTMLButtonElement>();
    render(
      <form onSubmit={submit}>
        <RefreshAction
          ref={buttonRef}
          loading={false}
          error={false}
          onRefresh={onRefresh}
          labels={labels}
          variant="secondary"
          size="sm"
          className="fixture-action"
          title="Record action"
        />
      </form>,
    );
    const button = screen.getByRole("button", { name: labels.idle });
    expect(buttonRef.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("title", "Record action");
    expect(button).toHaveClass("fixture-action");
    fireEvent.click(button);
    expect(onRefresh.mock.calls[0][0].type).toBe("click");
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByText(labels.retry)).not.toBeInTheDocument();
  });

  it("respects caller disabling independently of loading and accepts non-text labels", async () => {
    const onRefresh = vi.fn();
    render(
      <RefreshAction
        loading={false}
        error={false}
        disabled
        onRefresh={onRefresh}
        labels={{ ...labels, idle: <strong>Update records</strong> }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: labels.idle }));
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
