import { Button, Nav } from "@wintermuted/ui-theme/react";
import React, { useEffect, useId, useRef, useState } from "react";
import FontAwesome from "react-fontawesome";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./MainNavigationMenu.scss";

interface Props {
  numberOfBookmarks: number;
  timeOfLastLoad: string;
}

export default function MainNavigationMenu(props: Props) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const homeActive =
    pathname === "/" ||
    pathname === "/nearby" ||
    pathname.startsWith("/nearby/");
  const linesActive = pathname === "/lines" || pathname.startsWith("/lines/");

  useEffect(() => setMenuOpen(false), [pathname]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      className="wm-docs-topbar transit-app-header"
      onKeyDown={event => {
        if (event.key === "Escape" && menuOpen) {
          closeMenu();
          menuButton.current?.focus();
        }
      }}
    >
      <div className="wm-docs-topbar-inner transit-header-inner">
        <Link
          to="/"
          className="wm-docs-topbar-brand transit-brand"
          onClick={closeMenu}
        >
          <FontAwesome
            name="bus"
            className="transit-brand-icon"
            aria-hidden="true"
          />
          <h1>Go By Transit</h1>
        </Link>
        <Button
          ref={menuButton}
          className="wm-docs-topbar-toggle transit-nav-toggle"
          variant="ghost"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen(open => !open)}
        >
          <FontAwesome name={menuOpen ? "times" : "bars"} aria-hidden="true" />
          {menuOpen ? "Close" : "Menu"}
        </Button>
        <div
          id={menuId}
          className={`transit-navigation-content${menuOpen ? " is-open" : ""}`}
        >
          <Nav
            className="wm-docs-topbar-nav transit-primary-nav"
            aria-label="Primary navigation"
          >
            <Link
              to="/"
              className={`wm-docs-topbar-link-devdocs${
                homeActive ? " is-active" : ""
              }`}
              aria-current={homeActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <FontAwesome name="home" fixedWidth aria-hidden="true" />
              Home
            </Link>
            <Link
              to="/lines/all"
              className={`wm-docs-topbar-link-devdocs${
                linesActive ? " is-active" : ""
              }`}
              aria-current={linesActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <FontAwesome name="train" fixedWidth aria-hidden="true" />
              Lines
            </Link>
            <NavLink
              to="/bookmarks"
              className={({ isActive }) =>
                `wm-docs-topbar-link-devdocs${isActive ? " is-active" : ""}`
              }
              onClick={closeMenu}
            >
              <FontAwesome name="bookmark" fixedWidth aria-hidden="true" />
              Bookmarks
            </NavLink>
          </Nav>
        </div>
      </div>
    </header>
  );
}
