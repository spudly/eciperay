---
name: eciperay-commits
description: >-
  Conventional commit format for the Eciperay monorepo. Use when writing commit
  messages, summarizing changes for git, or choosing scope/type for
  semantic-release.
disable-model-invocation: true
---

# Eciperay commit messages

Canonical rules live in [`commitlint.config.cjs`](../../commitlint.config.cjs).
Commits are validated by the Husky `commit-msg` hook.

## Format

```
<type>(<scope>): <subject>
```

- Lowercase `type` and `scope`
- Imperative subject (e.g. `add`, `fix`, `remove`)
- No trailing period on the subject
- Keep the subject ≤ 72 characters

Optional body and footers follow
[Conventional Commits](https://www.conventionalcommits.org/).

## Types

| Type                                               | Version bump | Use for                                  |
| -------------------------------------------------- | ------------ | ---------------------------------------- |
| `feat`                                             | minor        | New user-facing behavior                 |
| `fix`                                              | patch        | Bug fixes                                |
| `perf`                                             | patch        | Performance improvements                 |
| `feat!` or footer `BREAKING CHANGE:`               | major        | Breaking API or behavior changes         |
| `chore`, `docs`, `ci`, `build`, `test`, `refactor` | none         | Maintenance (no release unless breaking) |

## Scopes (required)

Pick the package(s) whose code changed. Allowed scopes:

`app`, `web`, `server`, `client`, `types`, `theme`, `android`, `deps`, `ci`,
`release`

- `android` is an alias for `app`
- Use multiple scopes when a change spans packages:
  `feat(web,client): share hook`
- `deps` — root or lockfile dependency changes
- `ci` — GitHub Actions, Husky, release tooling
- `release` — reserved for semantic-release bot commits; do not use manually

## Scope selection

1. Prefer the **innermost** package whose files you edited
   (`packages/<scope>/`).
2. If you changed shared code consumed elsewhere, use that package's scope —
   deploy expansion handles dependents.
3. Do not use a broad scope when a narrow one fits (`feat(web):` not
   `feat(client):` for web-only UI).

## Deploy impact (semantic-release)

Releases on `master` deploy only what scopes imply (with transitive expansion):

| Scope                   | Deploy targets                              |
| ----------------------- | ------------------------------------------- |
| `web`                   | Fly (API + web)                             |
| `server`                | Fly                                         |
| `app`, `android`        | Android                                     |
| `client`                | Fly + Android (expands to server, web, app) |
| `types`                 | Fly + Android (expands to all consumers)    |
| `theme`                 | Fly + Android (expands to web, app)         |
| `deps`, `ci`, `release` | Version only if releasable type; no deploy  |

## Examples

| Good                                           | Bad                           |
| ---------------------------------------------- | ----------------------------- |
| `feat(web): add recipe import drag target`     | `Added import drag target`    |
| `fix(server): validate recipe image mime type` | `fix: mime validation`        |
| `feat(client): add shared query key helper`    | `feat(client): Added helper.` |
| `chore(ci): add release workflow`              | `chore: ci stuff`             |
| `feat(types)!: rename Ingredient fields`       | `breaking types change`       |

## Do not

- Hand-write `chore(release):` commits — semantic-release creates those
- Omit scope — the hook rejects `feat: add thing`
- Use scopes outside the allowed list

## Squash merges

GitHub squash-merge PR titles should follow the same format; the local
`commit-msg` hook does not run on GitHub.
