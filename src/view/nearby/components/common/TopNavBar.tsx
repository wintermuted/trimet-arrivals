import React from "react";
import { Link } from "react-router-dom";
import FontAwesome from "react-fontawesome";

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
  backTo = "/nearby/simple-routes"
}: TopNavBarParams) {
  const title = shortSign ? `${id} to ${shortSign}` : id;
  const backIcon = <FontAwesome name="caret-left" aria-hidden="true" />;
  return (
    <header className="transit-detail-header">
      {onBack ? (
        <button type="button" className="transit-detail-back" aria-label="Back" onClick={onBack}>
          {backIcon}
        </button>
      ) : (
        <Link to={backTo} className="transit-detail-back" aria-label="Back">
          {backIcon}
        </Link>
      )}
      <div className="transit-detail-heading">
        <h3
          className={truncateTitle ? "transit-detail-title-truncated" : undefined}
          title={truncateTitle ? title : undefined}
        >
          {title}
        </h3>
        {subtitle && <p className="transit-detail-subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
