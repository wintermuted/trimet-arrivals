import React from "react";
import { ThemeProvider } from "@wintermuted/ui-theme/react";
import { Provider } from "react-redux";
import "./App.css";
import AppFooter from "./component/footer/AppFooter";
import { FeatureFlagsProvider } from "./component/feature-flags/FeatureFlags";
import { TimeDisplayProvider } from "@trimet-arrivals/ui";
import RootAppRoutes from "./routes/RootAppRoutes";
import appStore from "./store/store";

const store = appStore();

export default class App extends React.Component {
  public render() {
    return (
      <ThemeProvider>
        <Provider store={store}>
          <FeatureFlagsProvider>
            <TimeDisplayProvider>
              <div className="transit-app-shell">
                <RootAppRoutes />
                <AppFooter />
              </div>
            </TimeDisplayProvider>
          </FeatureFlagsProvider>
        </Provider>
      </ThemeProvider>
    );
  }
}
