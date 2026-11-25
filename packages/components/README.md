# @overworld/ui-staging

Private, context-free React components staged in `packages/components` for a
later transfer to `wintermuted/wintermuted-ui`. This package is an active local
consumer dependency, not a published replacement for Wintermuted UI.

Import components and their prop types from `@overworld/ui-staging`. Hosts supply
React 18.3/19 and `@wintermuted/ui-react` 1.x, and load
`@wintermuted/ui-theme/index.css`. Component imports include their scoped CSS.
The package reuses Wintermuted's Button and theme tokens rather than duplicating
base controls. Internal `.js` imports are compatible with the eventual
TypeScript-to-JavaScript transfer.

Each CSS import has a matching `.d.css.ts` declaration. The package enables
`allowArbitraryExtensions` for its bundler-loaded styles without importing app
or Vite ambient types. Boundary tests verify both the actual stylesheet and its
declaration; no wildcard stylesheet declarations or disabled import checks are
needed.

## Contracts and adapters

| Component | Staged responsibility | Consumer responsibility |
| --- | --- | --- |
| `LoadStatus` | Announce supplied errors/warnings, show loading, and call each supplied retry once. Disable retry while loading; isolate clicks/keydown from containing disclosures. Render nothing when idle. | Prepare messages and source state, supply accessible retry/loading labels and optional icons/help renderer, perform requests, retain snapshots, and position help. |
| `RefreshAction` | Select loading/retry/idle content, disable during loading or explicit disabling, and forward button props/ref/click events. Always use `type="button"`. | Supply all labels and state; perform refreshes and decide what received data remains visible. |
| `ActionDisclosure` | Initially expand by default; toggle an accessible heading button with a unique panel ID; keep hidden content mounted; optionally open from a separate header action. | Supply heading level, title, action content/label/ref/callback, and any domain cleanup on collapse. The collapse callback runs before the state change; the action callback follows scheduling expansion, just as in the original adapter. Consumers own post-render focus effects. |

`LoadStatus` takes readonly `LoadIssue[]` (`message`, optional `retry`) and optional
warning strings. Without `renderHelp`, messages are visible. With it, the same
combined message is announced in a visually hidden alert/status and supplied to
the renderer with an `"error"` or `"warning"` tone. Loading without errors gets a
separate status, including when warnings are present. A loading failure still
shows its error and disabled retry, not a second loading announcement.

`ActionDisclosure` accepts heading levels 2-6, an optional explicit heading ID,
`defaultExpanded`, and an optional indicator. Header actions are siblings of the
heading, never controls nested inside the disclosure trigger. Optional
`classNames` preserve consumer-specific header/heading/action hooks. It is not a
replacement for the canonical Wintermuted Accordion or Tooltip.

Go By Transit's `PlacesLoadStatus` adapter retains `placeSourceIssues`, its labels,
icons, and the map-aware `PlacesHelp` renderer. `PlannerDisclosure` retains its
existing `@overworld/ui/journeys` API, heading policy, caret/edit icons, and preview
cleanup. Shared alert cards and route alert views retain fetching, empty/error
copy, last-received data, and button placement.

## Neutral examples

```tsx
import { ActionDisclosure, LoadStatus, RefreshAction } from "@overworld/ui-staging";

<ActionDisclosure
  title="Record options"
  headingLevel={2}
  action={{ label: "Edit records", onClick: startEditing }}
>
  <RecordOptions />
</ActionDisclosure>

<LoadStatus
  issues={error ? [{ message: "Records could not be loaded.", retry: reload }] : []}
  loading={loading}
  labels={{ retry: "Retry records", loading: "Loading records" }}
/>

<RefreshAction
  loading={loading}
  error={error}
  onRefresh={reload}
  size="sm"
  labels={{ idle: "Update records", loading: "Updating records", retry: "Retry records" }}
/>
```

Callbacks, state, and `RecordOptions` above belong to the host.

## Verification and transfer gates

From the repository root:

```powershell
npm exec -- vitest run --project ui-staging-package --maxWorkers=1
```

The Nx `@overworld/ui-staging:test:package` target runs the same suite. CI's
existing run-many typecheck includes the package's strict source and test
configuration; normal coverage includes staged component source.

Before transfer:

1. Keep behavior and public-prop fixtures runnable with neutral content and
   package-local test setup. Boundary tests reject app/domain imports, router
   dependencies, storage/fetch ownership, and transit-specific copy/selectors.
2. Preserve passing affected consumer tests and desktop/mobile light/dark parity,
   including separate action focus, mounted hidden content, source-error help,
   and disabled retry states.
3. Integrate React behavior/types into `@wintermuted/ui-react` and scoped styles
   into `@wintermuted/ui-theme`, reviewing canonical primitives for overlap.
   Include source tests, compiled declarations, and packed-consumer checks under
   both supported React versions in the destination.
4. Publish only as a separate approved action. After the published versions are
   available, migrate Overworld imports and remove staging in another action.

No transit types, route/search algorithms, map geometry, theme/time preference
persistence, application services, or destination publication belong here.
