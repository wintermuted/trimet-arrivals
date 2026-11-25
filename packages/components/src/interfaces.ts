import type { Button } from "@wintermuted/ui-react";
import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  ReactNode,
  Ref,
} from "react";

export interface RefreshActionProps extends Omit<
  ComponentPropsWithoutRef<typeof Button>,
  "children" | "onClick" | "type"
> {
  loading: boolean;
  error: boolean;
  onRefresh: MouseEventHandler<HTMLButtonElement>;
  labels: {
    idle: ReactNode;
    loading: ReactNode;
    retry: ReactNode;
  };
}

export interface LoadIssue {
  message: string;
  retry?: () => void;
}

export interface LoadStatusHelp {
  message: string;
  tone: "error" | "warning";
}

export interface LoadStatusProps {
  issues: readonly LoadIssue[];
  warnings?: readonly string[];
  loading?: boolean;
  labels: {
    retry: string;
    loading: string;
  };
  renderHelp?: (help: LoadStatusHelp) => ReactNode;
  retryIcon?: ReactNode;
  loadingIcon?: ReactNode;
  className?: string;
}

export interface ActionDisclosureAction {
  label: string;
  icon?: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
}

export interface ActionDisclosureProps {
  title: ReactNode;
  children: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  headingId?: string;
  defaultExpanded?: boolean;
  onCollapse?: () => void;
  indicator?: ReactNode;
  action?: ActionDisclosureAction;
  className?: string;
  classNames?: {
    header?: string;
    heading?: string;
    action?: string;
  };
}
