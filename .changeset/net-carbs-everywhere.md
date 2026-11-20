---
'@eciperay/types': minor
'@eciperay/client': minor
'@eciperay/server': minor
'@eciperay/web': minor
'@eciperay/app': minor
---

Net carbs (carbs − fiber) now render beside total carbs everywhere a recipe's
carbs are shown: the recipe-detail nutrition rows, recipe card/list summaries,
meal and meal-plan totals and per-day rows, and meal member lines on web and
native. Net carbs is omitted where fiber is unknown — including meal/plan totals
when any contributing recipe's fiber is unknown (aggregate fiber now
propagates unknown instead of treating it as zero) — and plan/meal totals
compute it from the summed carbs and fiber via the one canonical helper.
