---
'@eciperay/web': patch
'@eciperay/app': patch
---

Importing a recipe that already exists in your library (same title and same
ingredients) now warns you before a second copy is created, on text, URL, and
image imports in the web app and the mobile app. The warning names the
existing recipe; choosing to import anyway creates the second copy.
