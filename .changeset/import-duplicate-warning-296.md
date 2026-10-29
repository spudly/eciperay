---
'@eciperay/web': patch
'@eciperay/app': patch
---

Importing a recipe that already exists in your library (same title and same
ingredients) now warns you before a second copy is created, on text, URL, and
image imports in the web app and the mobile app. The warning names the
existing recipe; importing the same recipe again creates the second copy.
