---
'@eciperay/types': patch
'@eciperay/server': patch
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/mcp-server': patch
---

Meal and meal-plan entries now split servings into servings to cook and servings
to eat (#363): meal recipe members and direct meal ingredients, and meal-plan
recipe entries, each carry `servingsToCook` and `servingsToEat` (eat defaults to
cook). Meal and plan nutrition is computed from what is eaten, while the plan
shopping list scales by what is cooked; meal and plan detail surfaces show both
numbers per entry, and the plan detail gains the weekly totals / daily averages
band over the eaten totals. The MCP meal and meal-plan tools accept and return
both fields. Note: the design-system meal and meal-plan forms (9.2.x) expose a
single servings stepper, which edits servings to cook — servings to eat follows
it while the two are equal and is otherwise preserved — so setting a distinct
servings-to-eat in the web/native forms awaits a design-system companion.
