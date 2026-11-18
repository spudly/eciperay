---
'@eciperay/web': patch
'@eciperay/client': patch
---

Discover page: the title, search placeholder, empty and error messages, and
the no-ratings label now flow through the app's Lingui catalogs (en-US and
en-XA pseudo-locale) instead of hardcoded strings. The shared discovery
formatting helpers accept a caller-supplied no-ratings label, defaulting to
the existing constant for their other callers.
