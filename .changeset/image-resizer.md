---
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
---

Recipe images now load through a generic on-the-fly image resizer: the server serves bucket-cached resized variants at a requested width (aspect preserved, original format kept, immutable cache headers, original-image fallback on any failure), replacing a recipe image deletes its cached variants, and recipe cards, discovery/home thumbnails, the recipe detail hero, and the public recipe page request appropriately sized images instead of full-size originals.
