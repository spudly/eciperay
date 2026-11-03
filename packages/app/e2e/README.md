# Android emulator use-case tests (#183 Phase 2)

Maestro flows that install the app on an Android emulator and exercise
the core flows end to end: app launch, the Recipes screen's filter bar
and list, Shared with me, and recipe detail. The Recipes assertions are
the regression coverage for #162, where the Recipes screen rendered one
giant empty box — no search field, no filters, no cards — in a build
that compiled perfectly; only a real native render catches that class
of break.

## Fixture mode (no backend, no account)

The suite runs against a dedicated build with `E2E_FIXTURE_MODE=true`
baked in at bundle time (see `scripts/envShim.cjs`). In that build:

- `src/lib/supabase.ts` swaps the real client for a stub that reports a
  permanent fixture session, so the app boots signed in.
- `src/lib/api.ts` swaps the HTTP client for an in-memory fixture
  client (`src/lib/e2eFixtures.ts`) that serves seeded recipes for the
  list, shared-with-me, detail, versions, cook-log, and nutrition
  routes the exercised screens call.

Nothing touches the production backend or a real account. Release and
preview builds never set the flag, so fixture mode cannot ship.

## CI

The `android-e2e` job in `.github/workflows/android-build.yml` builds
the fixture APK (`assembleRelease`, x86_64 for the emulator), installs
Maestro (pinned in the workflow), and runs these flows on an emulator.
Per the 2026-11-02 release-only gating it runs on release PRs (head
branch `changeset-release/*`); it also runs on manual
`workflow_dispatch` of the Android Build workflow, which is the
deliberate way to exercise it outside a release. `android-gate` depends
on it, so a red suite blocks a release merge while ordinary PRs skip
it and stay green.

## Running locally

With an emulator running and Maestro installed
(https://maestro.mobile.dev):

```sh
# Build and install the fixture build (from packages/app/android):
E2E_FIXTURE_MODE=true API_BASE_URL=https://fixture.invalid/api \
SUPABASE_URL=https://fixture.invalid SUPABASE_ANON_KEY=fixture-anon-key \
  ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/release/app-release.apk

# Flows 01–02 navigate in the UI (launch, then the Recipes tab).
# Flows 03–04 assert screens reached by deep link: the DS href rows
# expose no clickable node to Maestro's hierarchy taps, and the
# manifest's only VIEW intent filter is host-scoped to the Supabase
# auth callback, so the CI step delivers the links to MainActivity
# with explicit-component intents between the Maestro runs:
maestro test packages/app/e2e/maestro/01-launch.yaml
maestro test packages/app/e2e/maestro/02-recipes.yaml
adb shell am start -W -n com.eciperay/.MainActivity \
  -a android.intent.action.VIEW -d "com.eciperay://recipes/e2e-recipe-pasta"
maestro test packages/app/e2e/maestro/03-recipe-detail.yaml
adb shell am start -W -n com.eciperay/.MainActivity \
  -a android.intent.action.VIEW -d "com.eciperay://shared-with-me"
maestro test packages/app/e2e/maestro/04-shared-with-me.yaml
```
