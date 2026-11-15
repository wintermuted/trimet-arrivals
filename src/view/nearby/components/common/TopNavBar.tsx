import React from "react";
import { Link } from "react-router-dom";

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
      <h3>{title}</h3>
      <Link to={backTo} className="transit-nav-link">
        Back
      </Link>
    </header>
  );
}
