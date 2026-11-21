# @trimet-arrivals/journeys

Recent journey storage and trip planner endpoint rules.
It keeps the five latest distinct, directional endpoint pairs under the existing
storage key. It also compares endpoints and resolves stop IDs, names, and aliases.
The app owns planner navigation, URL state, and validation messages.

From the repository root: `npx nx run @trimet-arrivals/journeys:test:package`.
