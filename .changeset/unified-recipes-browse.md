---
'@eciperay/web': patch
---

Web recipe browsing is now one unified **Recipes** page (#409): your own recipes
come first — including recipes shared with you, badged "Shared" — with the
public Discover catalog below them, all under one search and filter bar. The
signed-in header gains a recipe search that lands on the unified page with the
search applied, the separate "Shared with me" nav item is gone (its route
redirects to `/recipes`), and the Home "Shared with me" action lands on the
unified page too. The signed-out Discover page is unchanged.
