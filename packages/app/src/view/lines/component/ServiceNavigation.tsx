import { isNumber } from "lodash";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Link, NavLink, useLocation } from "react-router-dom";

function ServiceNavigation() {
  const location = useLocation();
  const [a, b, routeId] = location.pathname.split("/");
  const value = routeId ? parseInt(routeId, 10) : null;
  const isRoute = value && isNumber(value);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `wm-tab-btn${isActive ? " wm-tab-btn-active" : ""}`;

  if (isRoute) {
    return (
      <div className="transit-container">
        <nav aria-label="Breadcrumb" className="transit-breadcrumbs">
          <Link to="/lines">Lines</Link>
          <span aria-hidden="true">/</span>
          <Link to="/lines/max">Max</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{routeId}</span>
        </nav>
      </div>
    );
  }

  return (
    <div className="transit-container">
      <nav
        aria-label="Transit services"
        className="wm-tab-bar transit-service-nav"
      >
        <NavLink to="/lines/all" className={linkClass}>
          <FontAwesome name="route" className="route" /> All
        </NavLink>
        <NavLink to="/lines/max" className={linkClass}>
          <FontAwesome name="train" className="train" /> Max
        </NavLink>
        <NavLink to="/lines/streetcar" className={linkClass}>
          <FontAwesome name="train" className="train" /> Streetcar
        </NavLink>
        <NavLink to="/lines/bus" className={linkClass}>
          <FontAwesome name="bus" className="bus" /> Bus
        </NavLink>
        <NavLink to="/lines/wes" className={linkClass}>
          <FontAwesome name="subway" className="subway" /> WES
        </NavLink>
      </nav>
      <br />
    </div>
  );
}

export default ServiceNavigation;
