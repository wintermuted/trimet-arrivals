import React from "react";
import "./PlaceResultRow.scss";

export interface PlaceResultLinkProps {
  className: string;
  children: React.ReactNode;
}

export interface PlaceResultRowProps {
  name: React.ReactNode;
  secondary?: React.ReactNode;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "nearby" | "search" | "saved";
  renderLink: (props: PlaceResultLinkProps) => React.ReactNode;
}

export function PlaceResultRow({
  name,
  secondary,
  icon,
  trailing,
  action,
  variant = "nearby",
  renderLink,
}: PlaceResultRowProps) {
  const labelClass =
    variant === "search"
      ? "transit-global-search-label"
      : variant === "saved"
        ? "bookmark-place-label"
        : "ow-place-result-label";
  return (
    <li className={`ow-place-result-row ow-place-result-row--${variant}`}>
      {renderLink({
        className:
          variant === "nearby"
            ? "transit-place-result"
            : "ow-place-result-link",
        children: (
          <>
            {icon}
            <span className={labelClass}>
              <strong>{name}</strong>
              {secondary && <small>{secondary}</small>}
            </span>
            {trailing}
          </>
        ),
      })}
      {action}
    </li>
  );
}
