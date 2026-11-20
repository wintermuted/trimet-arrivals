// tslint:disable:no-submodule-imports
import "@wintermuted/ui-theme/index.css";
import { initTheme } from "@wintermuted/ui-theme/theme";
import "font-awesome/css/font-awesome.css";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

initTheme();
ReactDOM.render(<App />, document.getElementById("root") as HTMLElement);
