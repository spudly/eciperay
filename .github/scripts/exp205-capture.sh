#!/usr/bin/env bash
# EXPERIMENT ONLY (#205 diagnosis): runs inside the emulator-runner
# step. Installs the release APK built by the workflow, launches the
# app (whose RootNavigator on this throwaway branch forces the
# signed-in branch and whose RecipesScreen serves fixture rows), taps
# the Recipes tab exactly as a user would, and captures screenshots +
# a uiautomator dump + logcat to /tmp/exp205-out for artifact upload.
#
# RESUMED INVESTIGATION (2026-10-24): the fixture library is now 53
# recipes (Stephen's real count) and this script sweeps DEVICE
# SETTINGS per variant — system font scale and display density —
# because the symptom is device-specific, reinstall-proof, and
# seen across many versions (device settings survive reinstall via
# Google device-settings backup even though the app itself sets
# allowBackup=false). EXP205_VARIANTS selects the subset to run
# (space-separated); default is the full matrix. Every variant gets
# a screenshot at the top of the list, a scrolled screenshot, and a
# uiautomator dump so a reproducing variant yields measured bounds
# immediately.
set -uo pipefail

OUT="/tmp/exp205-out${EXP205_OUT_SUFFIX:-}"
mkdir -p "$OUT"

APK="packages/app/android/app/build/outputs/apk/release/app-release.apk"
echo "Installing $APK"
adb install -r "$APK" | tee "$OUT/install.txt"

# Keep the display awake and bright for the whole session.
adb shell svc power stayon true
adb shell settings put system screen_brightness_mode 0
adb shell settings put system screen_brightness 255
adb shell settings put system screen_off_timeout 1800000

VARIANTS="${EXP205_VARIANTS:-base font130 font130disp disp font85}"
DEFAULT_DENSITY="$(adb shell wm density | grep -oE '[0-9]+' | head -1)"
echo "Default density: $DEFAULT_DENSITY" | tee "$OUT/variants.txt"

reset_settings() {
  adb shell settings put system font_scale 1.0 >/dev/null 2>&1 || true
  adb shell wm density reset >/dev/null 2>&1 || true
  sleep 2
}

apply_variant() {
  case "$1" in
    base) ;;
    font130)
      adb shell settings put system font_scale 1.30
      ;;
    font130disp)
      adb shell settings put system font_scale 1.30
      # "Largest" display size on a 420dpi Pixel surface is ~1.3x.
      adb shell wm density 550
      ;;
    disp)
      adb shell wm density 550
      ;;
    font85)
      adb shell settings put system font_scale 0.85
      ;;
    *)
      echo "Unknown variant: $1" >&2
      return 1
      ;;
  esac
  sleep 3
}

# Tap the Recipes tab by locating its label in a UI dump, so the tap
# stays correct when density changes move the tab bar in pixels.
tap_recipes_tab() {
  adb shell uiautomator dump /sdcard/exp205-tab.xml >/dev/null 2>&1 || true
  adb pull /sdcard/exp205-tab.xml /tmp/exp205-tab.xml >/dev/null 2>&1 || true
  local bounds
  bounds="$(grep -oE 'text="Recipes"[^>]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' /tmp/exp205-tab.xml 2>/dev/null | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | head -1)"
  if [ -n "$bounds" ]; then
    local nums x1 y1 x2 y2
    nums="$(echo "$bounds" | grep -oE '[0-9]+')"
    x1="$(echo "$nums" | sed -n 1p)"; y1="$(echo "$nums" | sed -n 2p)"
    x2="$(echo "$nums" | sed -n 3p)"; y2="$(echo "$nums" | sed -n 4p)"
    adb shell input tap $(( (x1 + x2) / 2 )) $(( (y1 + y2) / 2 ))
  else
    # Fallback: the pixel_6 surface position used by the first matrix.
    adb shell input tap 324 2290
  fi
}

capture_variant() {
  local variant="$1"
  echo "=== Variant: $variant ===" | tee -a "$OUT/variants.txt"
  reset_settings
  apply_variant "$variant"
  {
    echo "font_scale=$(adb shell settings get system font_scale)"
    adb shell wm density
    adb shell wm size
  } >> "$OUT/variants.txt" 2>&1

  adb shell am force-stop com.eciperay || true
  adb shell input keyevent KEYCODE_WAKEUP
  adb shell monkey -p com.eciperay -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  # Let the app boot to the (initial) Home tab and settle.
  sleep 25
  tap_recipes_tab
  sleep 8
  adb exec-out screencap -p > "$OUT/$variant-recipes.png"

  # Scroll the recipe list and capture again.
  adb shell input swipe 540 1700 540 700 300
  sleep 3
  adb exec-out screencap -p > "$OUT/$variant-scrolled.png"

  adb shell uiautomator dump "/sdcard/exp205-$variant.xml" >/dev/null 2>&1 || true
  adb pull "/sdcard/exp205-$variant.xml" "$OUT/$variant-window.xml" >/dev/null 2>&1 || true

  # RESUMED INVESTIGATION round 2 (2026-10-24): the density-550
  # variants showed a ~1250px tall first card with NO children in the
  # dump — possibly a transient VirtualizedList blank cell caught
  # mid-scroll, possibly a deterministic empty card. Settle much
  # longer, capture again at the same position, then scroll a second
  # step and capture + dump again, to distinguish the two.
  sleep 10
  adb exec-out screencap -p > "$OUT/$variant-settled.png"
  adb shell input swipe 540 1700 540 700 300
  sleep 10
  adb exec-out screencap -p > "$OUT/$variant-scrolled2.png"
  adb shell uiautomator dump "/sdcard/exp205-$variant-2.xml" >/dev/null 2>&1 || true
  adb pull "/sdcard/exp205-$variant-2.xml" "$OUT/$variant-window2.xml" >/dev/null 2>&1 || true
}

for variant in $VARIANTS; do
  capture_variant "$variant"
done

reset_settings
adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
echo "Done"
ls -la "$OUT"
