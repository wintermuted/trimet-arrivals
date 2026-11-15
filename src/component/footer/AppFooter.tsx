import { ThemeSelect } from "@wintermuted/ui-theme/react";
import React from "react";

export default function AppFooter() {
  return (
    <footer className="transit-app-footer">
      <span>Go By Transit</span>
      <div className="transit-footer-theme">
        <ThemeSelect label="Theme" />
      </div>
    </footer>
  );
}
