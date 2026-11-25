import { Button } from "@wintermuted/ui-react";
import { forwardRef } from "react";
import type { RefreshActionProps } from "./interfaces.js";

export const RefreshAction = forwardRef<HTMLButtonElement, RefreshActionProps>(
  function RefreshAction(
    { loading, error, onRefresh, labels, disabled, ...buttonProps },
    ref,
  ) {
    return (
      <Button
        {...buttonProps}
        ref={ref}
        type="button"
        onClick={onRefresh}
        disabled={loading || disabled}
        aria-busy={loading}
      >
        {loading ? labels.loading : error ? labels.retry : labels.idle}
      </Button>
    );
  },
);
