---
'@eciperay/client': patch
---

Meal and meal-plan recipe picker suggestions can no longer contain the same
recipe twice (#386). The picker search assembles its suggestions from every
matching page of server search results, and the meal-plan picker concatenates
its meal and recipe sources; both assemblies now dedupe by recipe id (entry key
for meal-plan entries), first occurrence wins, so each recipe appears at most
once in the suggestion list in the meal form and the meal-plan form, on web and
in the app.
