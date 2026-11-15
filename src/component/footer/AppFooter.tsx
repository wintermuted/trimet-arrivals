import { useTheme } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";

export default function AppFooter() {
  const { resolvedTheme, setPreference } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

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
          <button
            type="button"
            className="wm-docs-topbar-toggle"
            onClick={() => setPreference(nextTheme)}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {nextTheme === "light" ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              ) : (
                <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
              )}
            </svg>
            <span>{nextTheme === "light" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </nav>
    </footer>
  );
}
