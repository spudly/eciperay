---
'@eciperay/web': patch
---

Shopping list check-off persistence (#323): on the web, checked-off shopping
list items now persist across a page reload or navigating away and back
(previously every reload reset all checks). The checked line keys are stored in
localStorage keyed by user and meal plan (the app's established pattern for this
kind of per-user UI state — there is no server-side checked field; the list
itself is derived from the plan), checks for lines that have left the list are
pruned when the list loads, and checked items keep their existing visually
distinct treatment from the design-system page.
