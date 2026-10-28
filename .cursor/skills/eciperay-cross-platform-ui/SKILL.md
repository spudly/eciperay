---
name: eciperay-cross-platform-ui
description: >-
  Cross-platform UI guidelines for Eciperay (mirrored app/web components,
  @eciperay/theme ui-* classes, @eciperay/client shared props). Use when
  creating or editing components in packages/app or packages/web, adding shared
  styling, or deciding platform parity.
disable-model-invocation: true
---

# Eciperay Cross-Platform UI

## Architecture

Two UI codebases share logic and tokens:

| Package            | Role                                     |
| ------------------ | ---------------------------------------- |
| `packages/app`     | React Native screens/components          |
| `packages/web`     | Vite + DOM pages/components              |
| `@eciperay/client` | Hooks, API, copy, **shared props types** |
| `@eciperay/theme`  | Tokens + shared **`ui-*` CSS classes**   |

Do not share JSX across platforms. Mirror components instead.

## Screens vs components

| Layer          | Location                            | Uses `className`?                           |
| -------------- | ----------------------------------- | ------------------------------------------- |
| Screen / page  | `screens/`, `pages/`, `navigation/` | **No** — data, navigation, mutations only   |
| View component | `components/{domain}/*View.tsx`     | Yes                                         |
| Primitive      | `components/ui/`                    | Yes — generic, domain-agnostic widgets only |

When a screen needs new styling, add or extend a component under
`src/components/`. Use props like `spacing="list"` instead of passing
`className` from screens.

ESLint rule `eciperay-ui/no-classname-outside-components` enforces this in CI.

## Where code goes

| If it is…                                  | Put it in…                                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| Hook, validator, API, copy string          | `@eciperay/client`                                              |
| Color/font token                           | `@eciperay/theme/theme.css`                                     |
| Shared visual pattern used by both mirrors | `@eciperay/theme/components.css` as `ui-*`                      |
| UI on both platforms                       | Same path in `app` + `web` `src/components/`                    |
| UI on one platform only                    | That package + `PLATFORM_ONLY` in `scripts/uiParityRegistry.ts` |

**Never** put Tailwind class strings in `@eciperay/client` — Tailwind will not
compile them for app/web.

## Mirroring workflow

1. Define props (export type from `@eciperay/client` when shared)
2. Add or reuse `ui-*` classes in `packages/theme/components.css`:

```css
@utility ui-loading-center {
  @apply flex items-center justify-center;
}
```

3. Implement twice with platform primitives (`View` vs `div`,
   `ActivityIndicator` vs CSS spinner)
4. Use semantic tokens inline: `text-primary`, `text-muted`, `bg-surface`
5. Add matching tests (Jest app / Vitest web)
6. Update **both** mirrors in one PR

## `ui-*` naming

| Rule                                | Example                                           |
| ----------------------------------- | ------------------------------------------------- |
| Prefix `ui-`                        | `ui-link`, not `link`                             |
| kebab-case                          | `ui-loading-center`                               |
| Visual role, not file name          | `ui-loading-center`, not `ui-screen-loading-gate` |
| `@apply` theme utilities only       | `@apply text-primary font-medium`                 |
| RN-safe utilities in shared classes | No `grid`, no bare `hover:*` (use `@variant web`) |

Platform layout differences stay in TSX: app `flex-1`, web `min-h-full`.

## Generic `ui/*` widgets

Shared prop types live in `@eciperay/client`:

| Module                      | Examples                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| `ui/layoutComponents.ts`    | `TextField`, `SearchField`, `PageTitle`                                |
| `ui/formComponents.ts`      | `CheckboxField`, `SelectField`, `SectionCard`, `StarRatingInput`       |
| `ui/selectionComponents.ts` | `CheckboxSelectList`, `ToggleChipGroup`, `TabBar`, `ThumbnailListCard` |

Mirrored implementations live in `packages/app/src/components/ui/` and
`packages/web/src/components/ui/` with the same export name. Domain components
(`recipe/*`, `tags/*`, etc.) compose these widgets — they fetch data, map domain
models to generic `{id, label}` / option lists, and pass callbacks. **Do not**
import recipe types or API clients inside `ui/*`.

When adding a reusable widget:

1. Add props to `formComponents.ts` or `selectionComponents.ts` (export from
   `@eciperay/client`)
2. Add `ui-*` classes to `packages/theme/components.css` when styling is shared
3. Implement app + web mirrors under `components/ui/`
4. Add Vitest tests on web (`ComponentName.test.tsx` colocated)
5. Register in `MIRROR_PAIRS`

## UI parity registry

[`scripts/uiParityRegistry.ts`](../../scripts/uiParityRegistry.ts) is the source
of truth:

- `MIRROR_PAIRS` — must exist in both packages; CI fails if only one side
  changes
- `PLATFORM_ONLY` — single-platform components; **every entry needs `reason`**

When adding a platform-only component:

```ts
{
  path: 'AppShell.tsx',
  platform: 'web',
  reason: 'Web top-nav shell; app uses React Navigation.',
}
```

Run `npm run validate:ui-parity` locally.

## Loading components (reference)

Shared behavior in client:

- `useDelayedTrue`, `DEFAULT_LOADING_DELAY_MS`
- `ScreenLoadingGateProps`, `InlineLoadingIndicatorProps`

Mirrored components:

- `ScreenLoadingGate` — full-screen gate with delayed spinner
- `InlineLoadingIndicator` — inline list/section loading

Shared class: `ui-loading-center` (+ platform layout utilities in each mirror).

## Component showcase (retired)

The in-app and web component showcases are retired (app: design-system#129; web:
design-system#130 B7 C2). The design-system Storybooks are the showcase now:
components that live in `@spudly/ui` are previewed through its stories. There is
no showcase catalog, no `showcaseModuleLoaders`, and no `ShowcaseDemoRenderer` —
do not register new `.demo` properties or showcase loaders. (A few legacy
`.demo` expandos remain on components that were never showcase-driven; leave
them alone.)

When a component is in `MIRROR_PAIRS`, register it in `MIRROR_PAIRS` only and
run `npm run validate:ui-parity`.

## PR checklist

- [ ] Mirrored? Updated app **and** web
- [ ] Platform-only? `PLATFORM_ONLY` + `reason`
- [ ] Props? Shared type in client
- [ ] Styling? `components.css` with `@apply`, not duplicated strings
- [ ] Tests on both sides for behavior parity
- [ ] New/changed mirror registered in `MIRROR_PAIRS`? (Showcase retired — no
      catalog, loaders, or `.demo` registration)

See also [CONTRIBUTING.md](../../CONTRIBUTING.md).
