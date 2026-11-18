---
'@eciperay/web': patch
'@eciperay/app': patch
---

Lingui catalogs are now imported directly as .po files and compiled on the fly
(@lingui/vite-plugin on web, @lingui/metro-transformer on native) instead of
committing the generated messages.ts files — no user-visible change; the same
strings ship in both locales, and parallel catalog work no longer conflicts in
generated files.
