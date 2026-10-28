---
'@eciperay/web': patch
---

A recipe detail link for a deleted or non-existent recipe now shows a
"Page not found" message instead of staying on the loading placeholder
forever. A 404 for the recipe also wins over a cached copy, and deleting
a recipe drops its cached detail entry so its old detail URL cannot
render the stale recipe.
