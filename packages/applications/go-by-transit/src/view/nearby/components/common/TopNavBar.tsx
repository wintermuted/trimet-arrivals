import { DetailHeader } from "@overworld/ui";
import React from "react";
import { Link } from "react-router-dom";

interface TopNavBarParams {
  id: string;
  shortSign?: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  truncateTitle?: boolean;
  action?: React.ReactNode;
}

export function TopNavBar({
  id,
  shortSign,
  subtitle,
  truncateTitle = false,
  action,
  onBack,
  backTo,
}: TopNavBarParams) {
  const title = shortSign ? `${id} to ${shortSign}` : id;
  return (
    <DetailHeader
      title={title}
      subtitle={subtitle}
      truncateTitle={truncateTitle}
      action={action}
      onBack={onBack}
      renderBack={
        onBack && !backTo
          ? undefined
          : (props) => (
              <Link
                {...props}
                to={backTo ?? "/nearby/simple-routes"}
                onClick={(event) => {
                  if (
                    !event.defaultPrevented &&
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.altKey &&
                    !event.ctrlKey &&
                    !event.shiftKey
                  )
                    onBack?.();
                }}
              />
            )
      }
    />
  );
}
