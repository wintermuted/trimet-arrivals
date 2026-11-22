import { Card, CardBody, CardHeader, FieldGroup, Select } from "@wintermuted/ui-theme/react";
import React from "react";
import { useBookmarkShortcuts } from "@overworld/bookmarks/react";
import { useSelector } from "react-redux";
import { SHORTCUTS } from "../../../api/localstorage/bookmarkShortcuts";
import { selectBookmarks } from "../../../store/selectors/bookmarkSelectors";
import { routeBookmarksSelector } from "../../../store/selectors/routeBookmarkSelectors";

export default function BookmarkShortcutsEditor() {
  const stops = useSelector(selectBookmarks);
  const routes = useSelector(routeBookmarksSelector);
  const { shortcuts, error, setShortcut } = useBookmarkShortcuts(stops, routes);

  return (
    <Card>
      <CardHeader as="h2">Home and Work shortcuts</CardHeader>
      <CardBody>
        <p>Choose bookmarked stops and optional commute routes. Shortcuts stay in this browser.</p>
        {error && <p role="alert">{error}</p>}
        <div className="bookmark-shortcut-fields">
          {SHORTCUTS.map(({ key, kind, label }) => {
            const bookmarks = kind === "stop" ? stops : routes;
            const id = shortcuts[key];
            const options = Object.entries(bookmarks);
            return (
              <FieldGroup key={key} label={label} htmlFor={`shortcut-${key}`}>
                <Select
                  id={`shortcut-${key}`}
                  value={id ?? ""}
                  disabled={options.length === 0 && id === undefined}
                  onChange={event => {
                    const nextId = event.target.value ? Number(event.target.value) : undefined;
                    setShortcut(key, nextId);
                  }}
                >
                  <option value="">{options.length || id !== undefined ? "Not set" : `No bookmarked ${kind}s`}</option>
                  {id !== undefined && !bookmarks[id] && (
                    <option value={id} disabled>Bookmark no longer available</option>
                  )}
                  {options.map(([bookmarkId, bookmark]) => (
                    <option key={bookmarkId} value={bookmarkId}>
                      {bookmark.desc || (kind === "stop" ? "Stop" : "Transit route")} ({bookmarkId})
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
