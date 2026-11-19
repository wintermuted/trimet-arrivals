import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FontAwesome from "react-fontawesome";

export default function PlacesHelp({ label, text }: { label: string; text: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const visible = (hovered || focused) && !dismissed;

  function enter() {
    clearTimeout(leaveTimer.current);
    setHovered(true);
    setDismissed(false);
  }
  function leave() {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  }
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  useLayoutEffect(() => {
    const trigger = button.current;
    const content = tooltip.current;
    if (!visible || !trigger || !content) return;
    function updatePosition() {
      const anchor = trigger.getBoundingClientRect();
      const panel = content.getBoundingClientRect();
      const sidebar = trigger.closest(".transit-nearby-results")?.getBoundingClientRect();
      if (sidebar && sidebar.height > 0 && (anchor.bottom <= sidebar.top || anchor.top >= sidebar.bottom)) {
        setDismissed(true);
        return;
      }
      const map = trigger.closest(".transit-nearby-layout")
        ?.querySelector(".transit-nearby-map-stage")?.getBoundingClientRect();
      const gap = 8;
      const alongside = map && map.left >= anchor.right;
      const left = alongside ? map.left + gap : anchor.right - panel.width;
      const top = alongside ? anchor.top : map ? map.top + gap : anchor.bottom + gap;
      setPosition({
        left: Math.max(gap, Math.min(left, window.innerWidth - panel.width - gap)),
        top: Math.max(gap, Math.min(top, (map?.bottom || window.innerHeight) - panel.height - gap))
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [visible, text]);

  useEffect(() => {
    if (!visible) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") setDismissed(true);
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !button.current?.contains(event.target) && !tooltip.current?.contains(event.target)) {
        setDismissed(true);
      }
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [visible]);

  return <>
    <Button ref={button} size="sm" variant="ghost" aria-label={`About ${label}`}
      aria-describedby={visible ? id : undefined}
      onMouseEnter={enter} onMouseLeave={leave}
      onFocus={() => { setFocused(true); setDismissed(false); }}
      onBlur={() => setFocused(false)} onClick={() => setDismissed(false)}>
      <FontAwesome name="info-circle" aria-hidden="true" />
    </Button>
    {visible && createPortal(
      <span ref={tooltip} id={id} role="tooltip" className="wm-tooltip transit-places-tooltip"
        style={position} onMouseEnter={enter} onMouseLeave={leave}>
        {text}
      </span>, document.body
    )}
  </>;
}
