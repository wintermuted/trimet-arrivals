import React from "react";
import FontAwesome from "react-fontawesome";
import { NavLink } from "react-router-dom";
import "./NearbySubNav.scss";

interface Props {
  stopCount: number;
  routeCount: number;
}

export default function NearbySubNav({ stopCount, routeCount }: Props) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `wm-tab-btn${isActive ? " wm-tab-btn-active" : ""}`;

  return (
    <nav aria-label="Nearby views" className="wm-tab-bar nearby-routes-nav">
      <NavLink to="/nearby/simple-routes" className={linkClass}>
        Simple Routes ({routeCount})
      </NavLink>
      <NavLink to="/nearby/stops" className={linkClass}>
        <FontAwesome name="route" className="route" />
        Stops ({stopCount})
      </NavLink>
      <NavLink to="/nearby/routes" className={linkClass}>
        <FontAwesome name="route" className="route" />
        Routes ({routeCount})
      </NavLink>
    </nav>
  );
}
