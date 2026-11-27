---
'@eciperay/types': minor
'@eciperay/server': minor
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Recipe tips UI (#635, tranche 2): the recipe version edit form (web and native) gains a repeatable tips editor — add, edit, reorder, and remove the version's tips, saved through the normal version save path — and the recipe detail now shows the version's tips at the bottom of the overview. `RecipeDetail` gains the displayed version's `tips` (the server detail mapping now carries the active version's list, and viewing another version overlays its tips), so the detail hosts pass them to the design system's `cookingTipLabel` line under Start Cooking. @spudly/ui 14 carries only the singular label, so multiple tips render as one italic line with each tip's "Tip: " lead-in preserved, in array order; a plural DS prop (one line per tip) remains a design-system follow-up.
