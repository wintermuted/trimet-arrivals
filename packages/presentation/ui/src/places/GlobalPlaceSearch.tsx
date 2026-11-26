import { Button } from "@wintermuted/ui-react";
import React, { useEffect, useId, useRef } from "react";
import FontAwesome from "react-fontawesome";
import "./GlobalPlaceSearch.scss";

export interface GlobalPlaceSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hint: React.ReactNode;
  scope: React.ReactNode;
  status: React.ReactNode;
  loadStatus?: React.ReactNode;
  children?: React.ReactNode;
  moreAction?: React.ReactNode;
  title?: string;
  inputLabel?: string;
  searchLabel?: string;
  resultsLabel?: string;
  closeLabel?: string;
}

export function GlobalPlaceSearch({
  query,
  onQueryChange,
  open,
  onOpenChange,
  hint,
  scope,
  status,
  loadStatus,
  children,
  moreAction,
  title = "All places",
  inputLabel = "Search all places",
  searchLabel = "All places",
  resultsLabel = "Global Places search results",
  closeLabel = "Close Places search",
}: GlobalPlaceSearchProps) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        onOpenChange(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, onOpenChange]);
  function close() {
    input.current?.focus();
    onOpenChange(false);
  }
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (!open || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const links = Array.from(
      root.current?.querySelectorAll<HTMLAnchorElement>(
        ".transit-global-search-results a",
      ) || [],
    );
    const index =
      event.target instanceof HTMLAnchorElement
        ? links.indexOf(event.target)
        : -1;
    if (event.target !== input.current && index < 0) return;
    const next =
      event.key === "ArrowDown"
        ? links[Math.min(index + 1, links.length - 1)]
        : links[index - 1] || input.current;
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }
  return (
    <div
      ref={root}
      className="transit-global-place-search"
      onKeyDownCapture={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          onOpenChange(false);
      }}
    >
      <form
        role="search"
        aria-label={searchLabel}
        onSubmit={(event) => {
          event.preventDefault();
          onOpenChange(true);
        }}
      >
        <label htmlFor={`${id}-input`} className="wm-sr-only">
          {inputLabel}
        </label>
        <FontAwesome
          name="search"
          className="transit-global-search-icon"
          aria-hidden="true"
        />
        <input
          ref={input}
          id={`${id}-input`}
          type="search"
          className="wm-input"
          autoComplete="off"
          placeholder={inputLabel}
          value={query}
          aria-controls={open ? `${id}-results` : undefined}
          aria-describedby={`${id}-hint`}
          onFocus={() => onOpenChange(true)}
          onClick={() => onOpenChange(true)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            onOpenChange(true);
          }}
        />
        <span id={`${id}-hint`} className="wm-sr-only">
          {hint}
        </span>
      </form>
      {open && (
        <section
          id={`${id}-results`}
          className="transit-global-search-popover"
          aria-label={resultsLabel}
        >
          <div className="transit-global-search-heading">
            <h2>{title}</h2>
            {loadStatus}
            <Button
              size="sm"
              variant="ghost"
              aria-label={closeLabel}
              onClick={close}
            >
              <FontAwesome name="times" aria-hidden="true" />
            </Button>
          </div>
          <p className="transit-global-search-scope">{scope}</p>
          <p role="status" className="transit-global-search-count">
            {status}
          </p>
          {children}
          {moreAction}
        </section>
      )}
    </div>
  );
}
