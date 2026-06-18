# Android permissions

This document lists permissions in the merged release manifest for
`com.eciperay`, why each is needed, and how runtime prompts are handled.

Regenerate the merged manifest after manifest changes:

```sh
cd packages/app/android
./gradlew :app:processReleaseMainManifest
# packages/app/android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
```

## Declared permissions

| Permission | Source | Purpose | Runtime prompt |
| ---------- | ------ | ------- | ---------------- |
| `INTERNET` | App manifest | API requests and Supabase auth | Normal permission (granted at install) |
| `CAMERA` | App manifest | Photograph a recipe card for image import | `PermissionsAndroid.request` with rationale before `launchCamera` (`ImportImageScreen`) |

## Photo library (no manifest permission)

`react-native-image-picker` uses the system photo picker on supported Android
versions, so `READ_MEDIA_*` / `READ_EXTERNAL_STORAGE` are not declared.
Before opening the picker, the app shows an in-app rationale dialog
(`confirmPhotoLibraryAccess`) on `ImportImageScreen` and `RecipeImageField`.

## Removed library permissions

`react-native-blob-util` declares storage, download, and network-state
permissions for features this app does not use (we only write recipe preview
files to the app cache). Those entries are stripped in `AndroidManifest.xml`
with `tools:node="remove"`:

- `WAKE_LOCK`
- `ACCESS_NETWORK_STATE`
- `ACCESS_WIFI_STATE`
- `WRITE_EXTERNAL_STORAGE`
- `READ_EXTERNAL_STORAGE`
- `DOWNLOAD_WITHOUT_NOTIFICATION`

## Cleartext HTTP

- `android:usesCleartextTraffic` is `false` in all build types.
- `res/xml/network_security_config.xml` allows cleartext only to
  `localhost`, `127.0.0.1`, and `10.0.2.2` (USB port-forwarding / emulator)
  so debug builds can reach a local API without enabling cleartext globally.
- Release builds use HTTPS production URLs baked in at bundle time.

## Dev-only settings

Release builds do not enable manifest placeholders or other debug-only network
flags. Local development relies on the network security config localhost
exception and `adb reverse` (see repo `README.md`).
