---
'@eciperay/server': patch
'@eciperay/mcp-server': patch
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/client': patch
---

Allow servings-to-cook of 0 for meal members and meal-plan recipe entries, so a
leftover meal cooks nothing and no longer inflates the shopping list.
Shopping-list generation skips 0-cook entries, and the editors let 0 be entered
with servings-to-eat staying positive.
