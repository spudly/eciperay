# Contributing

## Cross-platform UI

Recipoo ships two UI codebases:

- `packages/app` — React Native (iOS/Android)
- `packages/web` — Vite + React DOM

Share **logic and styling contracts**, not JSX. See
[`.cursor/skills/eciperay-cross-platform-ui/SKILL.md`](.cursor/skills/eciperay-cross-platform-ui/SKILL.md)
for agent-oriented guidelines.

### Where code goes

| Kind of code                                     | Package                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Hooks, validators, API, copy, shared props types | `@eciperay/client`                                                    |
| Design tokens + shared `ui-*` CSS classes        | `@eciperay/theme`                                                     |
| Reusable UI on both platforms                    | Mirror in `packages/app` and `packages/web` (same path + export name) |
| Platform-only UI                                 | One package only, registered in `scripts/uiParityRegistry.ts`         |

**Screens and pages must not use `className`.** All styling (including spacing
passed as props) belongs in `src/components/`. ESLint enforces this for
`packages/app` and `packages/web`. Extract layout into view components
(`HomeView`, `SignInView`) or shared primitives under `components/ui/`.

Domain components orchestrate data and wire generic `ui/*` widgets via props
from `@eciperay/client` (`formComponents.ts`, `selectionComponents.ts`,
`layoutComponents.ts`). Keep API types, hooks, and domain models out of
`components/ui/` — ui widgets accept only generic props (no `RecipeDetail`, no
eciperay API clients).

### Mirrored components

When a component exists on both platforms:

1. Use the **same relative path** under `src/components/` (e.g.
   `LegalLinks.tsx`)
2. Use the **same props type** from `@eciperay/client` when possible
3. Use **semantic Tailwind tokens** (`text-primary`, `text-muted`, `bg-surface`)
   and shared `ui-*` classes from `@eciperay/theme/components.css`
4. Write **tests in both packages** (Jest for app, Vitest for web) with matching
   scenarios
5. Update **both mirrors in the same PR**

### Shared `ui-*` classes

- Defined in [`packages/theme/components.css`](packages/theme/components.css)
  with `@utility ui-* { @apply … }`
- Prefix: `ui-`, kebab-case, named by **visual role** (e.g. `ui-loading-center`,
  `ui-link`)
- Do **not** put Tailwind class strings in `@eciperay/client` (Tailwind will not
  compile them)
- Platform-specific layout (`flex-1` vs `min-h-full`) stays as inline utilities
  in each mirror

### Platform-only components

If a component intentionally exists on one platform only, add it to
`PLATFORM_ONLY` in [`scripts/uiParityRegistry.ts`](scripts/uiParityRegistry.ts)
with a **required `reason`**. Examples:

- Good: `"Web top-nav shell; app uses React Navigation tab bar."`
- Bad: `"Web only"` or an empty reason

Temporary gaps must name the follow-up (e.g. pending web mirror) and be removed
once parity is added.

### Component showcase (development)

The in-app and web component showcases are retired (app: design-system#129; web:
design-system#130, B7 cluster C2). The design system Storybooks are the showcase
now — components are previewed via `@spudly/ui` stories, not via co-located
`.demo` properties or a showcase catalog.

### PR checklist (UI changes)

- [ ] Mirrored component? Updated both `packages/app` and `packages/web`
- [ ] New platform-only component? Added to `PLATFORM_ONLY` with `reason`
- [ ] Props changed? Updated shared type in `@eciperay/client`
- [ ] Shared styling changed? Updated `@eciperay/theme/components.css`
- [ ] Manually checked loading/empty/error on both platforms (for visible UI)
- [ ] No `className` in screens/pages/navigation — styling lives in components
      only

CI runs `npm run validate:ui-parity` to enforce the registry and mirror-pair
rules.
