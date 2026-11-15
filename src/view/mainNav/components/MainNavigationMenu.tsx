import { Menu, Nav, ThemeSelect } from "@wintermuted/ui-theme/react";
import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./MainNavigationMenu.scss";

interface Props {
  numberOfBookmarks: number;
  timeOfLastLoad: string;
}

export default function MainNavigationMenu(props: Props) {
  const { pathname } = useLocation();
  const homeActive =
    pathname === "/" ||
    pathname === "/nearby" ||
    pathname.startsWith("/nearby/");
  return (
    <header className="wm-app-header transit-app-header">
      <Link to="/" className="transit-brand">
        Go By Transit
      </Link>
      <Nav className="wm-app-nav" aria-label="Primary navigation">
        <Link
          to="/"
          className={homeActive ? "active" : undefined}
          aria-current={homeActive ? "page" : undefined}
        >
          Home
        </Link>
        <NavLink to="/lines/all">Lines</NavLink>
        <NavLink to="/bookmarks">Bookmarks</NavLink>
      </Nav>
      <div className="transit-header-actions">
        <ThemeSelect />
        <Menu
          label="Dropdown"
          items={[
            { id: "action", label: "Action", href: "#action/3.1" },
            { id: "another", label: "Another action", href: "#action/3.2" },
            { id: "something", label: "Something", href: "#action/3.3" },
            { id: "separated", label: "Separated link", href: "#action/3.4" }
          ]}
        />
      </div>
    </header>
  );
}
