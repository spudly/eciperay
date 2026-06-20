# Android version numbering and releases

Google Play requires two version fields on every upload:

| Field | Gradle property | User-visible | Rule |
| ----- | --------------- | ------------ | ---- |
| `versionCode` | `VERSION_CODE` | No | Integer that **must increase** on every Play Store upload (including re-uploads of the same `versionName`). |
| `versionName` | `VERSION_NAME` | Yes | Semver string shown in Play Console, device settings, and support requests. |

## Where values are defined

**Canonical user-facing version:** `version` in the repo root [`package.json`](../../../package.json). semantic-release bumps root and every workspace `packages/*/package.json` together.

`packages/app/android/app/build.gradle` reads the root `package.json` for `versionName`. Override at build time if needed:

```sh
./gradlew bundleRelease -PVERSION_CODE=42 -PVERSION_NAME=1.1.0
```

## Release workflow

### 1. Use conventional commits on `master`

Version bumps are automatic via [semantic-release](https://semantic-release.gitbook.io/) after CI passes. Use scoped commits (see [`.cursor/skills/eciperay-commits/SKILL.md`](../../../.cursor/skills/eciperay-commits/SKILL.md)):

```text
feat(web): add recipe import drag target
fix(server): validate image mime type
```

- `feat` → minor bump
- `fix` / `perf` → patch bump
- `BREAKING CHANGE` or `feat!` → major bump

The first `feat` from `0.0.0` becomes `0.1.0`.

You do **not** hand-edit version numbers or create tags. semantic-release commits `chore(release): X.Y.Z [skip ci]`, tags `vX.Y.Z`, and opens a GitHub Release.

### 2. Scoped deploys

The **Release** workflow (`.github/workflows/release.yml`) deploys only what changed:

| Scope | Deploy |
| ----- | ------ |
| `web`, `server` | Fly (API + web) |
| `app`, `android` | Android AAB → GitHub Release |
| `client` | Fly + Android |
| `types` | Fly + Android (all consumers) |
| `theme` | Fly + Android (web + app) |

Play Store upload remains manual via **Android Deploy → Run workflow** and a Play track.

### 3. Manual Android workflow

**Actions → Android Deploy → Run workflow** for Play uploads or ad-hoc builds (see root `README.md`).

CI sets:

```yaml
./gradlew bundleRelease -PVERSION_CODE=${{ github.run_number }}
```

- **`versionCode`** — `github.run_number`
- **`versionName`** — root `package.json` at the checked-out ref

### 4. Local release builds

For sideloading (APK) or manual AAB upload, use the signing env vars documented in the root `README.md`. Set `versionCode` explicitly when uploading to Play — it must be **greater than** the last `versionCode` on any track:

```sh
VERSION_CODE=123 ./scripts/android-release.sh
```

Or manually from `packages/app/android` after exporting signing env vars:

```sh
./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks
./gradlew bundleRelease -PVERSION_CODE=123
```

`versionName` comes from root `package.json` unless you pass `-PVERSION_NAME=...`.

### 5. Verify before upload

```sh
strings packages/app/android/app/build/generated/assets/react/release/index.android.bundle \
  | grep 'www.eciperay.com/api'

ls -la packages/app/android/app/build/outputs/bundle/release/
```

## Rules of thumb

- **Every Play upload** needs a new `versionCode`, even for rebuilds with the same `versionName`.
- **CI `run_number`** is the default `versionCode` source — do not rely on the `1` fallback in `build.gradle` for store releases.
- **iOS** uses separate Xcode fields; align `MARKETING_VERSION` with root `package.json` when shipping both platforms (iOS deploy CI is not wired yet).

## Related docs

- Root `README.md` — Android signing, GitHub secrets, Play tracks, commit conventions
- `packages/app/android/PERMISSIONS.md` — manifest permissions
