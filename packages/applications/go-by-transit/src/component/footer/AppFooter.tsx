import { Dialog, useTheme } from "@wintermuted/ui-theme/react";
import React, { useState } from "react";
import FontAwesome from "react-fontawesome";
import { useFeatureFlags } from "../feature-flags/FeatureFlags";

export default function AppFooter() {
  const { resolvedTheme, setPreference } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const { walkingEnabled, setWalkingEnabled } = useFeatureFlags();
  const [flagsOpen, setFlagsOpen] = useState(false);

  function openFeatureFlags() {
    setFlagsOpen(true);
  }

  function closeFeatureFlags() {
    setFlagsOpen(false);
  }

  function changeWalkingEnabled(event: React.ChangeEvent<HTMLInputElement>) {
    setWalkingEnabled(event.currentTarget.checked);
  }

  return (
    <footer className="transit-app-footer">
      <nav className="transit-footer-navigation" aria-label="Footer navigation">
        <div className="transit-footer-links">
          <a
            href="https://github.com/wintermuted/overworld"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesome name="github" aria-hidden="true" />
            Source
          </a>
          <a
            href="https://github.com/wintermuted/overworld/releases"
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
          <button
            type="button"
            className="wm-docs-topbar-toggle"
            aria-haspopup="dialog"
            aria-expanded={flagsOpen}
            onClick={openFeatureFlags}
          >
            <FontAwesome name="sliders" aria-hidden="true" />
            Feature flags
          </button>
        </div>
      </nav>
      {flagsOpen && (
        <Dialog open onClose={closeFeatureFlags} title="Feature flags">
          <div className="transit-feature-flags-content">
            <p>
              Experimental features are off by default. Changes apply
              immediately in this tab and reset on reload.
            </p>
            <label
              className="transit-feature-flag"
              htmlFor="feature-walking-estimates"
            >
              <input
                id="feature-walking-estimates"
                type="checkbox"
                role="switch"
                checked={walkingEnabled}
                aria-describedby="feature-walking-description"
                onChange={changeWalkingEnabled}
              />
              Enable walking estimates
            </label>
            <p id="feature-walking-description">
              Nearby sends your current location and stop coordinates, or the
              endpoints of trip-planner walking legs, to Mapbox to estimate
              walking distances and paths. GPS and mapped paths may
              be inaccurate; accessibility is not verified. Turning this off
              cancels requests and removes the walking path.
            </p>
          </div>
        </Dialog>
      )}
    </footer>
  );
}
