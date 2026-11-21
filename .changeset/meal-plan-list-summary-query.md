---
'@eciperay/server': patch
---

Meal Plans list no longer loads full plan details per plan: `GET /meal-plans`
now builds plan summaries (including entry counts, nutrition, and goal progress,
identical to before) from a small constant number of batched queries instead of
a sequential per-plan, per-entry N+1, so the list stays fast no matter how many
plans and entries a user has.
