import React from "react";
import { Link } from "react-router-dom";
import FontAwesome from "react-fontawesome";

interface TopNavBarParams {
  id: string;
  shortSign?: string;
  subtitle?: string;
  backTo?: string;
  truncateTitle?: boolean;
}

export function TopNavBar({
  id,
  shortSign,
  subtitle,
  truncateTitle = false,
  backTo = "/nearby/simple-routes"
}: TopNavBarParams) {
  const title = shortSign ? `${id} to ${shortSign}` : id;
  return (
    <header className="transit-detail-header">
      <Link to={backTo} className="transit-detail-back" aria-label="Back">
        <FontAwesome name="caret-left" aria-hidden="true" />
      </Link>
      <div className="transit-detail-heading">
        <h3
          className={truncateTitle ? "transit-detail-title-truncated" : undefined}
          title={truncateTitle ? title : undefined}
        >
          {title}
        </h3>
        {subtitle && <p className="transit-detail-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}
