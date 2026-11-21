// tslint:disable:no-submodule-imports
import "@wintermuted/ui-theme/index.css";
import { initTheme } from "@wintermuted/ui-theme/theme";
import "font-awesome/css/font-awesome.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

initTheme();
const root = document.getElementById("root");
if (!root) {
  throw new Error("The app root element is missing.");
}
createRoot(root).render(<App />);
