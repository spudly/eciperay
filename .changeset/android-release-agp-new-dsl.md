---
'@eciperay/app': patch
---

Android release build fixed (#466): the release AAB and emulator jobs failed evaluating the `:expo` project because expo-constants' Gradle script still reads the legacy `libraryVariants` API that AGP 9's new DSL removed (a regression from the Expo autolinking wiring in #464). The app now sets AGP's documented `android.newDsl=false` compatibility opt-out in `gradle.properties`, restoring the previous DSL so the release build configures cleanly. No user-facing behavior changes.
