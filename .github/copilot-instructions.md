# Copilot review instructions — eciperay

Eciperay is a TypeScript monorepo (Turborepo): a recipe-management app with web,
mobile, and server packages, consuming the shared `@spudly/ui` design system.
When reviewing pull requests in this repository, apply the conventions below.
Flag violations of them; do not suggest changes that contradict them.

## TypeScript style

- Use type aliases (`type`), never `interface`. Do not suggest converting a type
  alias to an interface.

## Dependencies and the lockfile

- `package-lock.json` is never hand-edited. It is regenerated with the pinned
  npm (the `packageManager` field in `package.json`, npm@10.9.4). Flag lockfile
  changes that look hand-edited; do not nitpick ordinary generated lockfile
  diffs.
- A `@spudly/ui` version bump must be a minimal-delta lockfile change — the
  version/resolved/integrity lines for `@spudly/ui`, plus the matching range
  update in the owning workspace's dependency entry (allow that required
  metadata). Flag a bump that re-resolves the `@spudly/ui` dependency subtree:
  it breaks the nested Tamagui 3.0.15 layout the Android build depends on.

## Styling

- All styling lives in the `@spudly/ui` design system; app code passes semantic
  props to design-system components. Flag Tailwind classes or `style` props
  added in app code, and do not suggest adding styling props to design-system
  components.

## Accessibility and states

- New or changed interactive elements need an accessible name/label; icon-only
  controls must be labeled.
- New data surfaces must handle failure and empty results explicitly: no silent
  spinners, and no empty-result message shown when a load has failed.

## Tests and docs

- New behavior needs a regression test that fails without the change.
- Behavior changes should update the matching "Run when" triggers in
  `docs/manual-tests.md`.
