---
'@eciperay/types': patch
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
---

Meals now show and edit their direct ingredients on the web (#362 tranche 2):
the meal detail page renders direct ingredients in their own Ingredients section
(quantity, servings, and nutrition scaled to the entry's total contribution;
rows are plain rows, never links), the meal form gains an ingredients section
for adding, editing, and removing direct ingredients (name, quantity, unit,
entry servings — validated by the host at save time), and a meal plan's shopping
list now includes the meal's direct ingredients at their entered quantity scaled
by how many times the plan includes the meal. Shopping-list sources for direct
ingredients carry a null recipe id/title, since the ingredient belongs to the
meal itself. Native and MCP parity remain tranche 3.
