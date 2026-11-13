---
'@eciperay/types': patch
'@eciperay/server': patch
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Daily nutrition goals are now min/max ranges instead of single targets (#521):
each of calories, protein, carbs, fat, and satiety carries an optional `Min` and
`Max` (either may be left blank), saving rejects a min above its max, and
meal-plan goal progress bands the per-day average (or plan total) against the
range — below the min is "Below goal", above the max is "Above goal", inside (or
on the unset side) is "On track" — with rows reading `actual / range · band`
(e.g. `1,940 / 1,800–2,200 · On track`, `128 / at least 110 · On track`,
`2,300 / up to 2,200 · Above goal`). Existing single goals migrate without
changing anyone's bands: macro goals become 90%–110% of the old value and a
satiety goal becomes a min at the old value. Account export carries the new
range shape.
