import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { BookmarkToggle, DetailHeader, WalkingDistance } from "./index";

describe("DetailHeader", () => {
  it("keeps the back action, truncated heading, subtitle, and action together", () => {
    const onBack = vi.fn();
    render(
      <DetailHeader
        title="A long stop name"
        subtitle="Stop 101"
        truncateTitle
        onBack={onBack}
        action={<button type="button">Details</button>}
      />,
    );
    const heading = screen.getByRole("heading", { name: "A long stop name" });
    expect(heading).toHaveAttribute("title", "A long stop name");
    expect(heading).toHaveClass("transit-detail-title-truncated");
    expect(screen.getByText("Stop 101")).toBeInTheDocument();
    const back = screen.getByRole("button", { name: "Back" });
    expect(back.closest("header").firstElementChild).toBe(back);
    expect(back.querySelector(".fa-caret-left")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
  });

  it("uses host-supplied navigation without requiring a router or inventing a destination", () => {
    const { rerender } = render(
      <DetailHeader
        title="Stop 101"
        backLabel="Return to stops"
        renderBack={(props) => <a {...props} href="/stops" />}
      />,
    );
    const link = screen.getByRole("link", { name: "Return to stops" });
    expect(link).toHaveAttribute("href", "/stops");
    expect(link).toHaveClass("transit-detail-back");
    rerender(<DetailHeader title="Stop 101" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("WalkingDistance", () => {
  it.each([
    [40, "Under 1 min"],
    [60, "About 1 min"],
    [61, "About 2 min"],
  ])("formats supplied meters and walking duration %s", (seconds, duration) => {
    const formatDistance = vi.fn(() => "250 m");
    render(
      <WalkingDistance
        enabled
        estimate={{ status: "ready", meters: 250, seconds }}
        straightLine="200 m"
        formatDistance={formatDistance}
      />,
    );
    expect(formatDistance).toHaveBeenCalledWith(250);
    expect(screen.getByText("250 m walk")).toBeInTheDocument();
    expect(screen.getByText(duration)).toBeInTheDocument();
    expect(screen.queryByText(/straight-line/)).not.toBeInTheDocument();
  });

  it.each([
    [true, undefined, "Calculating walk..."],
    [false, { status: "unreachable" as const }, "No walking route found"],
    [false, { status: "uncertain" as const }, "Walking distance unavailable"],
    [false, undefined, "Walking distance unavailable"],
  ])(
    "retains straight-line context for incomplete walking results",
    (loading, estimate, message) => {
      const formatDistance = vi.fn();
      render(
        <WalkingDistance
          enabled
          loading={loading}
          estimate={estimate}
          straightLine="100 ft"
          formatDistance={formatDistance}
        />,
      );
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.getByText("100 ft (straight-line)")).toBeInTheDocument();
      expect(formatDistance).not.toHaveBeenCalled();
    },
  );

  it("ignores walking results when disabled and preserves ready data during refresh", () => {
    const props = {
      estimate: { status: "ready" as const, meters: 100, seconds: 60 },
      straightLine: "75 m",
      formatDistance: (meters: number) => `${meters} m`,
    };
    const { rerender } = render(
      <WalkingDistance {...props} enabled={false} loading />,
    );
    expect(screen.getByText("75 m (straight-line)")).toBeInTheDocument();
    expect(screen.queryByText(/walk/i)).not.toBeInTheDocument();
    rerender(<WalkingDistance {...props} enabled loading />);
    expect(screen.getByText("100 m walk")).toBeInTheDocument();
    expect(screen.queryByText("Calculating walk...")).not.toBeInTheDocument();
  });
});

describe("BookmarkToggle", () => {
  it("reports clicks to the host and only changes state when controlled props change", () => {
    const onClick = vi.fn();
    const props = {
      onClick,
      bookmarkLabel: "Bookmark this stop",
      removeLabel: "Remove stop bookmark",
    };
    const { rerender } = render(
      <BookmarkToggle {...props} isBookmarked={false} />,
    );
    const button = screen.getByRole("button", { name: "Bookmark this stop" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.querySelector(".fa-bookmark")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ type: "click" }),
    );
    expect(button).toHaveAttribute("aria-pressed", "false");
    rerender(<BookmarkToggle {...props} isBookmarked showLabel />);
    expect(
      screen.getByRole("button", { name: "Remove stop bookmark" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Remove stop bookmark")).toBeInTheDocument();
  });

  it("supports text-only route actions and disables interaction without losing the accessible label", () => {
    const onClick = vi.fn();
    render(
      <BookmarkToggle
        isBookmarked={false}
        bookmarkLabel="Bookmark Route 15"
        removeLabel="Remove Route 15 bookmark"
        showIcon={false}
        showLabel
        disabled
        onClick={onClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Bookmark Route 15" });
    expect(button).toBeDisabled();
    expect(button.querySelector(".fa-bookmark")).toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
