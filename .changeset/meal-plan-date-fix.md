---
'@eciperay/server': patch
---

Meal plans with dates set no longer fail to create, update, or open: the server
now handles the Date objects node-postgres returns for the plan's start/end date
columns instead of throwing while building the response.
