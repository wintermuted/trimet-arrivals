import React from "react";
import { ThemeProvider } from "@wintermuted/ui-react";
import "./App.css";
import AppFooter from "./component/footer/AppFooter";
import { FeatureFlagsProvider } from "./component/feature-flags/FeatureFlags";
import { TimeDisplayProvider } from "@overworld/ui";
import RootAppRoutes from "./routes/RootAppRoutes";
import {
  BookmarksProvider,
  BookmarkStorageErrors,
} from "./state/bookmarks/BookmarksProvider";
import { ArrivalsProvider } from "./state/arrivals/ArrivalsProvider";

export default class App extends React.Component {
  public render() {
    return (
      <ThemeProvider>
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
      </ThemeProvider>
    );
  }
}
