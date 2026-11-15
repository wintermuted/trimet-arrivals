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
      className="wm-app-header transit-app-header"
      onKeyDown={event => {
        if (event.key === "Escape" && menuOpen) {
          closeMenu();
          menuButton.current?.focus();
        }
      }}
    >
      <Link to="/" className="transit-brand" onClick={closeMenu}>
        Go By Transit
      </Link>
      <Button
        ref={menuButton}
        className="transit-nav-toggle"
        variant="ghost"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen(open => !open)}
      >
        Menu
      </Button>
      <div
        id={menuId}
        className={`transit-navigation-content${menuOpen ? " is-open" : ""}`}
      >
        <Nav
          className="wm-app-nav transit-primary-nav"
          aria-label="Primary navigation"
        >
          <Link
            to="/"
            className={homeActive ? "active" : undefined}
            aria-current={homeActive ? "page" : undefined}
            onClick={closeMenu}
          >
            <FontAwesome name="home" fixedWidth aria-hidden="true" />
            Home
          </Link>
          <Link
            to="/lines/all"
            className={linesActive ? "active" : undefined}
            aria-current={linesActive ? "page" : undefined}
            onClick={closeMenu}
          >
            <FontAwesome name="train" fixedWidth aria-hidden="true" />
            Lines
          </Link>
          <NavLink to="/bookmarks" onClick={closeMenu}>
            <FontAwesome name="bookmark" fixedWidth aria-hidden="true" />
            Bookmarks
          </NavLink>
        </Nav>
      </div>
    </header>
  );
}
