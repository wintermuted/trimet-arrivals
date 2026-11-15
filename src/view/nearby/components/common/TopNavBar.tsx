import React from "react";
import { Link } from "react-router-dom";
import FontAwesome from "react-fontawesome";

interface TopNavBarParams {
  id: string;
  shortSign?: string;
  backTo?: string;
}

export function TopNavBar({
  id,
  shortSign,
  backTo = "/nearby/simple-routes"
}: TopNavBarParams) {
  const title = shortSign ? `${id} to ${shortSign}` : id;
  return (
    <header className="transit-detail-header">
      <Link to={backTo} className="transit-detail-back" aria-label="Back">
        <FontAwesome name="caret-left" aria-hidden="true" />
      </Link>
      <h3>{title}</h3>
    </header>
  );
}
