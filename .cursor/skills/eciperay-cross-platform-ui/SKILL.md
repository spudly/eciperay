---
name: eciperay-cross-platform-ui
description: >-
  Cross-platform UI guidelines for Eciperay (mirrored app/web components,
  @eciperay/theme ui-* classes, @eciperay/client shared props, dev component
  showcase .demo pattern). Use when creating or editing components in
  packages/app or packages/web, adding shared styling, wiring showcase demos, or
  deciding platform parity.
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

| Layer          | Location                            | Uses `className`?                         |
| -------------- | ----------------------------------- | ----------------------------------------- |
| Screen / page  | `screens/`, `pages/`, `navigation/` | **No** — data, navigation, mutations only |
| View component | `components/{domain}/*View.tsx`     | Yes                                       |
| Primitive      | `components/ui/`                    | Yes                                       |

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

## Component showcase (dev only)

Development preview for mirrored components:

| Platform | Entry                                                      |
| -------- | ---------------------------------------------------------- |
| Web      | `/dev/components` (lazy route, `import.meta.env.DEV` only) |
| App      | Profile → **Component Showcase** (`__DEV__` only)          |

Infrastructure lives in `components/dev/` on both platforms
(`ComponentShowcaseView`, `ShowcaseDemo`, `ShowcaseDemoFrame`,
`showcaseModuleLoaders`). Catalog and types live in `@eciperay/client`
(`componentShowcaseCatalog.ts`, `showcaseComponent.ts`).

### Co-located `.demo` on the component

Put the preview on the **same export** as the component, behind a DEV guard so
production bundles strip it:

```tsx
// Web
if (import.meta.env.DEV) {
  PrimaryButton.demo = function PrimaryButtonDemo() {
    return (
      <PrimaryButton
        label="Primary"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}

// App — same pattern with __DEV__
if (__DEV__) {
  PrimaryButton.demo = () => (
    <PrimaryButton
      label="Primary"
      onPress={() => {
        void 0;
      }}
    />
  );
}
```

When the demo needs providers (React Query, analytics, router), use
`ShowcaseDemoRenderer` and inject `Frame`:

```tsx
import {type ShowcaseDemoRenderer} from '@eciperay/client';

if (__DEV__) {
  const tagPickerDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <TagPicker
        selectedIds={['tag-1']}
        onChange={() => {
          void 0;
        }}
      />
    </Frame>
  );
  TagPicker.demo = tagPickerDemo;
}
```

`ShowcaseDemoFrame` supplies `QueryClientProvider` + `AnalyticsProvider`. The
showcase runs inside the app router (`/dev/components`), so demos that use
`Link` or `useNavigate` do not need an extra router wrapper.

**Do not** put demo JSX in a central registry file — keep it on the owning
component.

Every mirrored component in `SHOWCASE_MIRROR_PATHS` should have a DEV-guarded
`.demo` on **both** app and web mirrors. Use shared fixtures from
`@eciperay/client` and wrap query-dependent previews in `Frame` when needed.

### Adding or changing a mirrored component

When a component is in `MIRROR_PAIRS`:

1. Add its path to `SHOWCASE_MIRROR_PATHS` in
   `packages/client/src/dev/componentShowcaseCatalog.ts` (must stay in sync —
   tested against `MIRROR_PAIRS` minus `dev/*` showcase infra)
2. Add a dynamic import entry to **both** `showcaseModuleLoaders.ts` files (key
   = catalog `id`, e.g. `'ui/PrimaryButton'`)
3. Add a DEV-guarded `.demo` on **both** mirrors
4. Run `npm run validate:ui-parity` and showcase-related tests

Loader keys must match catalog ids exactly (`showcaseModuleLoaders.test.ts` on
app and web).

## PR checklist

- [ ] Mirrored? Updated app **and** web
- [ ] Platform-only? `PLATFORM_ONLY` + `reason`
- [ ] Props? Shared type in client
- [ ] Styling? `components.css` with `@apply`, not duplicated strings
- [ ] Tests on both sides for behavior parity
- [ ] New/changed mirror in showcase? Updated catalog path, both loaders, and
      `.demo` on both mirrors

See also [CONTRIBUTING.md](../../CONTRIBUTING.md).
