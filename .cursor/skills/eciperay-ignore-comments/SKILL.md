---
name: eciperay-ignore-comments
description: >-
  Require a `-- reason` on every linter, formatter, coverage, and TypeScript
  ignore/suppression comment in the Eciperay repo. Use when adding or editing
  eslint-disable, prettier-ignore, c8/istanbul ignore, @ts-expect-error, or
  similar suppressions.
disable-model-invocation: true
---

# Ignore comments must explain why

Every suppression comment must document **why** the rule is bypassed — not what
is being ignored. Future readers (and agents) should not need to reverse
engineer the intent.

## Format

Use `--` followed by a short reason (same convention as ESLint disables in this
repo):

```
<directive> -- <why this is necessary>
```

When a tool only recognizes a bare directive (e.g. `# prettier-ignore`), put the
reason on the **line immediately above** the directive.

Keep reasons factual and specific: trigger condition, tool bug, or constraint.

## Covered tools

| Tool               | Example                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| ESLint             | `// eslint-disable-next-line rule -- reason`                                                       |
| ESLint (block)     | `/* eslint-disable rule -- reason */`                                                              |
| Prettier (YAML/JS) | Reason comment on the line above `# prettier-ignore` (Prettier only recognizes the bare directive) |
| c8                 | `/* c8 ignore next -- reason */`                                                                   |
| istanbul/nyc       | `/* istanbul ignore next -- reason */`                                                             |
| TypeScript         | `// @ts-expect-error -- reason` (prefer over `@ts-ignore`)                                         |

Applies to any similar directive (`@ts-nocheck`, `eslint-disable-next-line`,
`biome-ignore`, etc.) even if not listed.

## Repo enforcement

- **ESLint**: `unicorn/no-abusive-eslint-disable` and
  `eslint-comments/require-description` require `-- reason` on disables.
- **Coverage**: custom `coverage-ignore/require-description` rule for c8 and
  istanbul comments.

Prettier and TypeScript suppressions are not linted automatically — follow this
skill anyway.

## Before adding an ignore

1. Can the code be refactored to satisfy the rule instead?
2. Can a narrower ignore target one line/rule instead of a whole file?
3. If ignore is truly needed, add the `-- reason` in the same edit.

## Examples

**Good**

```typescript
// eslint-disable-next-line unicorn/no-array-for-each -- Headers has no iterable entries in our TS lib
```

```typescript
/* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
```

```yaml
# Prettier splits ${{ ... }} across lines, making concurrency.group invalid YAML
# prettier-ignore
concurrency:
  group: android-deploy-${{ inputs.tag || github.event.inputs.play_track || 'manual' }}
```

**Bad**

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
```

```yaml
# prettier-ignore
```

```typescript
/* c8 ignore next */
```

## Do not

- Add bare `# prettier-ignore`, `eslint-disable`, or `c8 ignore` without a
  reason (on the same line via `--`, or on the line above for Prettier)
- Use vague reasons (`-- needed`, `-- fix later`, `-- doesn't work`)
- Use `@ts-ignore` when `@ts-expect-error` with a reason suffices
