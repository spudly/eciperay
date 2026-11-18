---
'@eciperay/server': patch
'@eciperay/mcp-server': patch
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/client': patch
---

Meal plan entries can carry a calendar day, and the meal plan detail views (web
and native) now render the week view: one column per day of the plan's range
with per-day totals computed from servings eaten. Entries without a day group
under the plan's first day; plans with no dates keep the flat entry list.
