import React from "react";
import { ThemeProvider } from "@wintermuted/ui-react";
import { Provider } from "react-redux";
import "./App.css";
import AppFooter from "./component/footer/AppFooter";
import { FeatureFlagsProvider } from "./component/feature-flags/FeatureFlags";
import { TimeDisplayProvider } from "@overworld/ui";
import RootAppRoutes from "./routes/RootAppRoutes";
import appStore from "./store/store";
import {
  BookmarksProvider,
  BookmarkStorageErrors,
} from "./state/bookmarks/BookmarksProvider";
import { ArrivalsProvider } from "./state/arrivals/ArrivalsProvider";

const store = appStore();

export default class App extends React.Component {
  public render() {
    return (
      <ThemeProvider>
        <Provider store={store}>
          <BookmarksProvider>
            <ArrivalsProvider>
              <FeatureFlagsProvider>
                <TimeDisplayProvider>
                  <div className="transit-app-shell">
                    <BookmarkStorageErrors />
                    <RootAppRoutes />
                    <AppFooter />
                  </div>
                </TimeDisplayProvider>
              </FeatureFlagsProvider>
            </ArrivalsProvider>
          </BookmarksProvider>
        </Provider>
      </ThemeProvider>
    );
  }
}
