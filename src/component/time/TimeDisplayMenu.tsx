import React, { useEffect, useRef, useState } from "react";
import FontAwesome from "react-fontawesome";
import { useLocation } from "react-router-dom";
import { useTimeDisplay } from "./TimeDisplay";
import TimeDisplaySettings from "./TimeDisplaySettings";

export default function TimeDisplayMenu() {
  const { formatTime } = useTimeDisplay();
  const { pathname } = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const menuRef = useRef<HTMLDetailsElement>(null);
  const currentTime = formatTime(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (
        menuRef.current?.open &&
        !menuRef.current.contains(event.target as Node)
      ) {
        menuRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <details className="transit-time-menu" ref={menuRef}>
      <summary
        aria-label={`Time display settings, current time ${currentTime}`}
      >
        <FontAwesome name="clock-o" aria-hidden="true" />
        <time dateTime={new Date(now).toISOString()}>{currentTime}</time>
      </summary>
      <div className="transit-time-menu-popover">
        <TimeDisplaySettings />
      </div>
    </details>
  );
}
