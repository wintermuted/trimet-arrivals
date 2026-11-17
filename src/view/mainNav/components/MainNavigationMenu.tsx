// tslint:disable-next-line:no-submodule-imports
import { Button, Nav } from "@wintermuted/ui-theme/react";
import React, { useEffect, useId, useRef, useState } from "react";
import FontAwesome from "react-fontawesome";
import { Link, useLocation } from "react-router-dom";
import TimeDisplayMenu from "../../../component/time/TimeDisplayMenu";
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
  const plannerActive =
    pathname === "/planner" || pathname.startsWith("/planner/");
  const linesActive = pathname === "/lines" || pathname.startsWith("/lines/");
  const stopsActive =
    pathname === "/stops" ||
    pathname === "/stop" ||
    pathname.startsWith("/stop/");
  const bookmarksActive =
    pathname === "/bookmarks" || pathname.startsWith("/bookmarks/");

  useEffect(() => setMenuOpen(false), [pathname]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((open) => !open);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    const timeMenu =
      event.currentTarget.querySelector<HTMLDetailsElement>(
        ".transit-time-menu",
      );
    if (event.key === "Escape" && timeMenu?.open) {
      timeMenu.open = false;
      timeMenu.querySelector("summary")?.focus();
      return;
    }
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
      menuButton.current?.focus();
    }
  }

  return (
    <header
      className="wm-docs-topbar transit-app-header"
      onKeyDown={handleKeyDown}
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
          onClick={toggleMenu}
        >
          <FontAwesome name={menuOpen ? "times" : "bars"} aria-hidden="true" />
          <span className="transit-nav-toggle-label">
            {menuOpen ? "Close" : "Menu"}
          </span>
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
              <FontAwesome name="home" fixedWidth={true} aria-hidden="true" />
              Home
            </Link>
            <Link
              to="/planner"
              className={`wm-docs-topbar-link-devdocs${
                plannerActive ? " is-active" : ""
              }`}
              aria-current={plannerActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <FontAwesome
                name="exchange"
                fixedWidth={true}
                aria-hidden="true"
              />
              Plan a trip
            </Link>
            <Link
              to="/stops"
              className={`wm-docs-topbar-link-devdocs${
                stopsActive ? " is-active" : ""
              }`}
              aria-current={stopsActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <FontAwesome
                name="map-marker"
                fixedWidth={true}
                aria-hidden="true"
              />
              Stops
            </Link>
            <Link
              to="/lines/all"
              className={`wm-docs-topbar-link-devdocs${
                linesActive ? " is-active" : ""
              }`}
              aria-current={linesActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <FontAwesome name="train" fixedWidth={true} aria-hidden="true" />
              Lines
            </Link>
            <Link
              to="/bookmarks"
              className={`wm-docs-topbar-link-devdocs${
                bookmarksActive ? " is-active" : ""
              }`}
              aria-current={bookmarksActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <FontAwesome
                name="bookmark"
                fixedWidth={true}
                aria-hidden="true"
              />
              Bookmarks
            </Link>
          </Nav>
        </div>
        <TimeDisplayMenu />
      </div>
    </header>
  );
}
