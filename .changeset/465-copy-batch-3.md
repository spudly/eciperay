---
'@eciperay/web': patch
'@eciperay/app': patch
---

Recipe detail, AI session, import, and native auth copy now comes from the
apps' Lingui catalogs: recipe-detail version, rating, cook-log, sharing, and
comments strings, the AI generate/tweak plan, preview, and save strings, the
import failure and image-picker labels, and the native sign-in, sign-up,
forgot-password, and reset-password confirmation and error alerts render in
the active locale (including the en-XA pseudo-locale), laying the groundwork
for translated page copy.
