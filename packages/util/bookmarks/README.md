# @overworld/bookmarks

Browser storage for stop and route bookmarks, sections, route groups, and shortcuts.
The package preserves the existing local storage keys and formats and clears
matching shortcuts when their bookmarks are deleted. Bookmark state and screens
live in the app.

The React-free main entry exports `subscribeBookmarkShortcuts(listener)`, which
returns an unsubscribe function. Subscribers receive relevant cross-tab storage
changes, storage clears, and same-tab notifications after successful shortcut
writes or bookmark-deletion cleanup. Failed writes do not notify subscribers.

The optional `@overworld/bookmarks/react` entry exports
`useBookmarkShortcuts(stops?, routes?)`, returning `shortcuts`, `error`,
`setShortcut(key, id?)`, and `refresh()`. Supplied bookmark registries validate
assignments; omitting an ID clears the shortcut. The hook manages subscriptions,
refreshes when registries change, and reports read/save failures while retaining
the previous shortcuts after a failed save. React is an optional peer; the main
entry does not load it. Bookmark context and navigation stay in the app.

From the repository root: `npx nx run @overworld/bookmarks:test:package`.
