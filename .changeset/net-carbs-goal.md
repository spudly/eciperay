---
'@eciperay/server': patch
---

Nutrition goals: the carbs goal now evaluates net carbs (total carbs minus fiber, following the #613 derivation) instead of total carbs. When fiber is unknown for the aggregated nutrition, the carbs goal progress is omitted rather than compared against total carbs. Stored goal values are unchanged and now mean net carbs.
