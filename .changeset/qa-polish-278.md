---
'@eciperay/web': patch
---

QA polish (#278): recipe cards for 1-serving recipes now read "1 serving"
instead of "1 servings" — the card subtitle (servings, cook time, rating,
satiety) is formatted by one shared helper in @eciperay/client for the web and
app list cards, the app's recipes and shared-with-me hosts, and the cooking-mode
scaled-ingredients label. A recipe whose nutrition is still being computed now
shows "Satiety pending" on its card instead of "Satiety…", which read as a
truncated value. The recipe detail Overview no longer repeats the recipe status
under the title: the status pill in the detail chrome's toolbar is the single
display, matching the design system's RecipeDetailPage, which takes status as a
page-level prop and keeps it out of the overview.
