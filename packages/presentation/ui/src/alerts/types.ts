import type { ReactNode } from "react";

export interface AlertFeedState {
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  loadingContent: ReactNode;
}
