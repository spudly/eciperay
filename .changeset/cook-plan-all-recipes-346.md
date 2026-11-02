---
'@eciperay/server': patch
---

Meal cooking mode no longer drops recipes from the combined cook plan (#346):
buildMealCookPlan previously skipped any member recipe whose AI step timing was
not 'ready' (generation failed or had not completed), so a multi-recipe meal
silently presented only the recipes whose timing was ready — in the reported
case, only the first recipe's steps ("Step 1 of 2"). Step timing is now treated
as an estimate overlay only: every member recipe's steps are included in the
plan, using stored durations or the existing five-minute default when none is
stored, while the plan's timingStatus still reports 'partial' or 'failed' when
timing generation did not succeed for a recipe.
