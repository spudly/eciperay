---
'@eciperay/client': patch
'@eciperay/app': patch
---

PostHog error reports and log records from the native app now carry the app version and build: the app reads them from expo-application at analytics creation, registers them as PostHog super properties, and the shared analytics layer merges them explicitly into every captureException and log call (caller-supplied values win), so error triage can tell current-build errors from outdated-app noise.
