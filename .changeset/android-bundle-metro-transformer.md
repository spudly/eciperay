---
'@eciperay/app': patch
---

Fixed the Android release bundle failing to build: the app now composes its
Lingui .po catalog compilation into Metro through a transformer that lives in
the app package and delegates to the app's own React Native babel transformer,
instead of @lingui/metro-transformer — which is hoisted to the monorepo root and
silently delegated to the root's older React Native toolchain, whose parser
cannot handle Flow syntax in the app's react-native version and failed the
bundle on react-native's own sources.
