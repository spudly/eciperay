---
'@eciperay/app': patch
'@eciperay/web': patch
---

Add menu: the add-recipe menu options' labels and descriptions now flow through
the app's Lingui catalogs (en-US and en-XA pseudo-locale) instead of hardcoded
strings, on web and native — each platform keeps its own wording where the two
differed.
