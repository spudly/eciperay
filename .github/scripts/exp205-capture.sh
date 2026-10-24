#!/usr/bin/env bash
# EXPERIMENT ONLY (#205 diagnosis): runs inside the emulator-runner
# step. Installs the release APK built by the workflow, launches the
# app (whose App.tsx on this throwaway branch renders the fixture
# RecipesListView harness), and captures screenshots + logcat to
# /tmp/exp205-out for artifact upload.
set -uo pipefail

OUT=/tmp/exp205-out
mkdir -p "$OUT"

APK="packages/app/android/app/build/outputs/apk/release/app-release.apk"
echo "Installing $APK"
adb install -r "$APK" | tee "$OUT/install.txt"

# Deterministic capture surface, same as the DS VR harness.
adb shell svc power stayon true
adb shell settings put system screen_brightness_mode 0
adb shell settings put system screen_brightness 255
adb shell settings put system screen_off_timeout 1800000
adb shell input keyevent KEYCODE_WAKEUP

echo "Launching com.eciperay"
adb shell monkey -p com.eciperay -c android.intent.category.LAUNCHER 1

# Give the release bundle time to boot and render the list.
sleep 30
adb exec-out screencap -p > "$OUT/screen1-top.png"

# Scroll the list down a little and capture again: are later cards
# also affected, and does the header scroll away cleanly?
adb shell input swipe 540 1700 540 700 300
sleep 3
adb exec-out screencap -p > "$OUT/screen2-scrolled.png"

adb shell uiautomator dump /sdcard/exp205-window.xml >/dev/null 2>&1 || true
adb pull /sdcard/exp205-window.xml "$OUT/window.xml" >/dev/null 2>&1 || true

adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
echo "Done"
ls -la "$OUT"
