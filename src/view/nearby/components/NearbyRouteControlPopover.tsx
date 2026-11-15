import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  buttonLabel: string;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

interface Position {
  left: number;
  top: number;
}

const viewportPadding = 8;

export default function NearbyRouteControlPopover({
  buttonLabel,
  disabled,
  label,
  children,
}: Props) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>();

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!open || !button || !panel) {
      return;
    }

    function updatePosition() {
      const buttonBounds = button.getBoundingClientRect();
      const panelBounds = panel.getBoundingClientRect();
      const below = buttonBounds.bottom + viewportPadding;
      const above = buttonBounds.top - panelBounds.height - viewportPadding;
      const top =
        below + panelBounds.height <= window.innerHeight - viewportPadding
          ? below
          : Math.max(
              viewportPadding,
              Math.min(
                above,
                window.innerHeight - panelBounds.height - viewportPadding
              )
            );
      const left = Math.max(
        viewportPadding,
        Math.min(
          buttonBounds.left,
          window.innerWidth - panelBounds.width - viewportPadding
        )
      );

      setPosition({ left, top });
    }

    updatePosition();
    panel
      .querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), button:not([disabled])"
      )
      ?.focus();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      closeIfOutside(event.target);
    }

    function closeOnOutsideClick(event: MouseEvent) {
      closeIfOutside(event.target);
    }

    function closeIfOutside(target: EventTarget | null) {
      if (
        target instanceof Node &&
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
        setPosition(undefined);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setOpen(false);
        setPosition(undefined);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle() {
    setOpen(!open);
    setPosition(undefined);
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={toggle}
      >
        {buttonLabel}
      </Button>
      {createPortal(
        <div
          ref={panelRef}
          id={id}
          className="transit-route-control-popover"
          role="group"
          aria-label={label}
          hidden={!open}
          style={position}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
