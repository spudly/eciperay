---
'@eciperay/app': patch
---

Recipe image cropping now actually crops on native (#453): Expo
autolinking is wired into the app (use_expo_modules! in the iOS Podfile
and the expo-autolinking-settings Gradle plugin on Android), so the
expo-image-manipulator module is registered and applying a crop in the
recipe form produces the cropped image instead of silently passing the
original photo through. Web cropping is unchanged.
