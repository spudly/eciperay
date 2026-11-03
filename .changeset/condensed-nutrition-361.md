---
'@eciperay/types': patch
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Condensed nutrition now shows all five values — protein, carbs, fat, calories,
and satiety score — wherever a summary nutrition line appears: recipe list and
shared-with-me cards, the Recipes page rows, public discovery cards, meal and
meal-plan totals, meal-plan entry lines, and the per-recipe member line on a
meal's detail page. Previously the condensed lines showed only calories,
protein, and satiety (recipe cards showed satiety alone), so carbs and fat
required opening the full nutrition detail. Each value appears only when it is
known for that recipe; a recipe whose nutrition is still pending keeps the
existing pending/placeholder satiety wording.
