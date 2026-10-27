---
name: eciperay-commits
description: >-
  Conventional commit format for the Eciperay monorepo. Use when writing commit
  messages, summarizing changes for git, or choosing type/scope and declaring
  version bumps with changesets.
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

| Type                                               | Changeset bump | Use for                                  |
| -------------------------------------------------- | -------------- | ---------------------------------------- |
| `feat`                                             | minor          | New user-facing behavior                 |
| `fix`                                              | patch          | Bug fixes                                |
| `perf`                                             | patch          | Performance improvements                 |
| `feat!` or footer `BREAKING CHANGE:`               | major          | Breaking API or behavior changes         |
| `chore`, `docs`, `ci`, `build`, `test`, `refactor` | none           | Maintenance (no release unless breaking) |

## Scopes (required)

Pick the package(s) whose code changed. Allowed scopes:

`app`, `web`, `server`, `client`, `types`, `android`, `deps`, `ci`, `release`

- `android` is an alias for `app`
- Use multiple scopes when a change spans packages:
  `feat(web,client): share hook`
- `deps` — root or lockfile dependency changes
- `ci` — GitHub Actions, Husky, release tooling
- `release` — reserved for the release publish step's version-sync commits
  (`chore(release): X.Y.Z`); do not use manually

## Scope selection

1. Prefer the **innermost** package whose files you edited
   (`packages/<scope>/`).
2. If you changed shared code consumed elsewhere, use that package's scope —
   deploy expansion handles dependents.
3. Do not use a broad scope when a narrow one fits (`feat(web):` not
   `feat(client):` for web-only UI).

## Deploy impact

Commit scopes do **not** drive deploys. When a release is cut, deploy targets
resolve from the **changed file paths** between the previous tag and the new
one, expanded through the package dependents graph:

| Changed package            | Deploy targets                          |
| -------------------------- | --------------------------------------- |
| `web`, `server`            | Fly (API + web)                         |
| `app`                      | Android                                 |
| `client`, `types`, `icons` | Fly + Android (expand to all consumers) |
| anything else              | Fly + Android (global change)           |

## Changesets (pending-release flow)

Releases run on a changesets pending-release flow (see issue #234). The
changesets configuration lives in `.changeset/config.json`: all seven workspace
packages are in one `fixed` group and always version together, and every package
is private, so changesets versions them but never publishes them to npm.
`changesets/action` keeps a Pending Release PR open on `master`; merging it is
the release.

A PR that changes user-facing behavior declares its version bump with a
changeset file (the commit type/scope no longer decides the bump):

1. Run `npm run changeset`, pick any package in the fixed group (they all bump
   together), and choose the bump the change maps to under the type table above
   (`feat` → minor, `fix`/`perf` → patch, breaking → major).
2. Write a one-line summary — it becomes the changelog entry — and commit the
   generated `.changeset/*.md` file with the PR.

## Examples

| Good                                           | Bad                           |
| ---------------------------------------------- | ----------------------------- |
| `feat(web): add recipe import drag target`     | `Added import drag target`    |
| `fix(server): validate recipe image mime type` | `fix: mime validation`        |
| `feat(client): add shared query key helper`    | `feat(client): Added helper.` |
| `chore(ci): add release workflow`              | `chore: ci stuff`             |
| `feat(types)!: rename Ingredient fields`       | `breaking types change`       |

## Do not

- Hand-write `chore(release):` commits — the release publish step creates those
  when a Pending Release PR merges
- Omit scope — the hook rejects `feat: add thing`
- Use scopes outside the allowed list

## Squash merges

GitHub squash-merge PR titles should follow the same format; the local
`commit-msg` hook does not run on GitHub.
