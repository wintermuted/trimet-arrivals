import { Button } from "@wintermuted/ui-react";
import type { LoadStatusProps } from "./interfaces.js";
import "./LoadStatus.css";

export function LoadStatus({
  issues,
  warnings = [],
  loading = false,
  labels,
  renderHelp,
  retryIcon,
  loadingIcon,
  className,
}: LoadStatusProps) {
  if (!issues.length && !loading && !warnings.length) return null;
  const message = [...issues.map((issue) => issue.message), ...warnings].join(
    " ",
  );
  const tone = issues.length ? "error" : "warning";

  return (
    <span
      className={`ui-staging-load-status${tone === "warning" ? " ui-staging-load-status--warning" : ""}${className ? ` ${className}` : ""}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {message && (
        <>
          <span
            role={tone === "error" ? "alert" : "status"}
            className={renderHelp ? "wm-sr-only" : undefined}
          >
            {message}
          </span>
          {renderHelp?.({ message, tone })}
          {issues.some((issue) => issue.retry) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={labels.retry}
              disabled={loading}
              onClick={(event) => {
                event.preventDefault();
                issues.forEach((issue) => issue.retry?.());
              }}
            >
              {retryIcon ?? labels.retry}
            </Button>
          )}
        </>
      )}
      {loading && !issues.length && (
        <span role="status" aria-label={labels.loading}>
          {loadingIcon ?? labels.loading}
        </span>
      )}
    </span>
  );
}
