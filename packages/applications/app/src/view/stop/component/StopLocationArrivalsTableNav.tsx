import { Nav } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { NavLink } from "react-router-dom";
import RouteIndicator from "../../../component/route/RouteIndicator";

interface Props {
  routes: number[];
  locationId: number;
}

function StopLocationArrivalsTableNav({ routes }: Props) {
  return (
    <Nav className="wm-tab-bar transit-service-nav" aria-label="Stop routes">
      <span>
        <NavLink to="/" className="wm-tab-btn">
          <FontAwesome name="route" className="route" />
          All
        </NavLink>
      </span>
      {routes.map(route => {
        return (
          <span key={route}>
            <NavLink to={`/route/${route}`} className="wm-tab-btn">
              <RouteIndicator routeId={route} linked={false} />
            </NavLink>
          </span>
        );
      })}
    </Nav>
  );
}

export default StopLocationArrivalsTableNav;
