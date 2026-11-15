import { ThemeSelect, useTheme } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";

export default function AppFooter() {
  const { preference } = useTheme();
  const themeIcon =
    preference === "system"
      ? "desktop"
      : preference === "dark"
      ? "moon-o"
      : "sun-o";

  return (
    <footer className="transit-app-footer">
      <nav className="transit-footer-navigation" aria-label="Footer navigation">
        <div className="transit-footer-links">
          <a
            href="https://github.com/wintermuted/trimet-arrivals"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesome name="github" aria-hidden="true" />
            Source
          </a>
          <a
            href="https://github.com/wintermuted/trimet-arrivals/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            Releases
          </a>
        </div>
        <div className="transit-footer-theme">
          <FontAwesome name={themeIcon} aria-hidden="true" />
          <ThemeSelect
            label=""
            aria-label="Theme"
            className="wm-docs-topbar-toggle"
          />
        </div>
      </nav>
    </footer>
  );
}
