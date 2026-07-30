---
name: eciperay-ci-monitor
description: >-
  Monitor GitHub Actions CI on a pull request until all checks pass or report
  failures with fixes. Use after creating or opening a PR, when the user asks to
  watch CI, verify build checks, or ensure a PR is green before merge.
---

# Monitor PR CI

After a PR is opened or updated, watch CI until every required check passes. Fix
failures caused by the PR, push, and re-watch until green or blocked.

## When to run

- Immediately after `gh pr create` or when the user shares a PR URL/number
- After pushing fixes to an open PR branch
- When the user asks to "watch CI", "make sure checks pass", or "fix CI"

Do **not** stop after opening the PR — monitoring is part of the task unless the
user explicitly says to skip it.

## CI jobs in this repo

The `CI` workflow (`.github/workflows/ci.yml`) runs on PRs to `master`:

| Job                                      | What it runs                                        |
| ---------------------------------------- | --------------------------------------------------- |
| `validate`                               | `npm run validate:node-version`                     |
| `typecheck`                              | `npm run typecheck`                                 |
| `lint (<package>)`                       | ESLint per workspace package                        |
| `lint-rules`                             | `npm run lint:unused-rules`                         |
| `depcheck`                               | `npm run depcheck`                                  |
| `workflows`                              | `npm run workflows:lint`                            |
| `test (<package>)`                       | `npm run test:coverage` per package (except server) |
| `test (packages/server, shard N/3)`      | Sharded server tests on 4-core runners              |
| `test (packages/server, merge coverage)` | Merges shard coverage and checks thresholds         |

Deploy workflows (`fly-deploy`, `android-deploy`, `release`) are separate and
usually not PR blockers unless the PR touches them.

## Monitor loop

```
Task progress:
- [ ] Identify PR (number, branch, URL)
- [ ] Watch checks until complete
- [ ] If all pass → report success and stop
- [ ] If any fail → diagnose, fix, push, repeat
```

### 1. Identify the PR

```bash
gh pr view --json number,url,headRefName,statusCheckRollup
```

If no PR exists yet, create one first (see user rules for `gh pr create`).

### 2. Watch checks

Prefer watching the PR rollup:

```bash
gh pr checks <number> --watch
```

If checks are not yet queued (fresh push), poll until they appear:

```bash
gh pr checks <number>
```

Use the `Await` tool with a long `block_until_ms` when running `--watch`, or
poll `gh pr checks` every 30–60s for in-progress runs.

### 3. All green → done

When every required check shows `pass` (or `skipping` where expected), report:

- PR URL
- Check summary (all passed)
- Any optional warnings worth noting

### 4. Failure → diagnose

For each failing check:

```bash
gh run list --branch <head-branch> --limit 5
gh run view <run-id> --log-failed
```

Read only the failed step logs needed to understand the error — not full JSON
payloads or unrelated job output.

Map failures to local commands (run from repo root):

| Failed job   | Reproduce locally                             |
| ------------ | --------------------------------------------- |
| `validate`   | `npm run validate:node-version`               |
| `typecheck`  | `npm run typecheck`                           |
| `lint (...)` | `npx eslint <package> --max-warnings 0`       |
| `lint-rules` | `npm run lint:unused-rules`                   |
| `depcheck`   | `npm run depcheck`                            |
| `workflows`  | `npm run workflows:lint`                      |
| `test (...)` | `npm run test:coverage --workspace=<package>` |

Fix only issues in this PR's scope. Follow project conventions
(`eciperay-testing`, `eciperay-commits`, `eciperay-ignore-comments`).

### 5. Push and re-watch

After fixes:

```bash
git push
gh pr checks <number> --watch
```

Repeat the loop until all checks pass.

## Constraints

- **Never** weaken CI, skip checks, or edit workflows just to make failures pass
- **Never** make unrelated changes to unrelated code
- If a failure looks unrelated to the PR, merge or rebase `master` into the
  branch first — another PR may have fixed it
- If blocked (flaky CI, missing secrets, infra outage, or out-of-scope failure),
  report clearly: which check failed, why you cannot fix it, and what the user
  should do

## Escalation

Stop the loop and ask the user when:

- The fix requires changing CI config or repo-wide policy
- Multiple fix-push cycles fail with the same error and the root cause is
  unclear
- Failures are on `master` but not reproducible locally on the PR branch

## Output template

```markdown
## CI status: [passing / failing]

**PR:** <url>

### Checks

| Check | Status      |
| ----- | ----------- |
| ...   | pass / fail |

### Actions taken

- [what was fixed, or "none — all green on first run"]

### Next steps

- [only if still failing or blocked]
```
