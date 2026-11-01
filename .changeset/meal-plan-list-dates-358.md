---
'@eciperay/server': patch
---

Meal plans: saving a plan with start/end dates and loading the meal-plan list no
longer fail with a 500 (#358, #360). Plan and meal timestamps are now returned
as the ISO strings their types declare (node-postgres returns timestamptz
columns as Date objects), a recipe with zero calories no longer throws out of
the nutrition aggregation that plan and meal loads share, and creating or
replacing a plan now writes the plan and its entries in a single transaction so
a failed save cannot leave an orphan or partially emptied plan behind.
