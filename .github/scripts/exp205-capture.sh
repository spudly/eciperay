#!/usr/bin/env bash
# EXPERIMENT ONLY (#205 diagnosis): runs inside the emulator-runner
# step. Installs the release APK built by the workflow, launches the
# app (whose RootNavigator on this throwaway branch forces the
# signed-in branch and whose RecipesScreen serves fixture rows), taps
# the Recipes tab exactly as a user would, and captures screenshots +
# a uiautomator dump + logcat to /tmp/exp205-out for artifact upload.
set -uo pipefail

OUT=/tmp/exp205-out
mkdir -p "$OUT"

APK="packages/app/android/app/build/outputs/apk/release/app-release.apk"
echo "Installing $APK"
adb install -r "$APK" | tee "$OUT/install.txt"

# Keep the display awake and bright for the whole session.
adb shell svc power stayon true
adb shell settings put system screen_brightness_mode 0
adb shell settings put system screen_brightness 255
adb shell settings put system screen_off_timeout 1800000
adb shell input keyevent KEYCODE_WAKEUP

echo "Launching com.eciperay"
adb shell monkey -p com.eciperay -c android.intent.category.LAUNCHER 1

# Let the app boot to the (initial) Home tab and settle.
sleep 30
adb exec-out screencap -p > "$OUT/screen0-home.png"

# Tap the Recipes tab (2nd of 5 tabs on a 1080x2400 pixel_6 surface).
adb shell input tap 324 2290
sleep 8
adb exec-out screencap -p > "$OUT/screen1-recipes.png"

# Scroll the recipe list and capture again.
adb shell input swipe 540 1700 540 700 300
sleep 3
adb exec-out screencap -p > "$OUT/screen2-scrolled.png"

adb shell uiautomator dump /sdcard/exp205-window.xml >/dev/null 2>&1 || true
adb pull /sdcard/exp205-window.xml "$OUT/window.xml" >/dev/null 2>&1 || true

adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
echo "Done"
ls -la "$OUT"
