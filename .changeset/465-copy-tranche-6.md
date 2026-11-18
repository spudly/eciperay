---
'@eciperay/web': patch
'@eciperay/app': patch
---

Home page: the title, subtitle, Browse/Add/Shared-with-me labels,
recently-viewed section title, and empty message — plus the native
Shared-with-me screen title — now flow through the apps' Lingui catalogs (en-US
and en-XA pseudo-locale) instead of hardcoded shared constants. The native app
gains its first I18nProvider wiring for this copy.
