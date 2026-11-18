---
'@eciperay/app': patch
'@eciperay/client': patch
'@eciperay/web': patch
---

Recipes list: the "Your recipes" section title, the discovery author
byline, the load and load-more error messages, and the recipe status
labels (Idea / Evolving / Perfected / Abandoned, shared with the recipe
form) now flow through the app's Lingui catalogs (en-US and en-XA
pseudo-locale) instead of hardcoded strings, on web and native.
