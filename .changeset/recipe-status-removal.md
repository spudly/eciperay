---
'@eciperay/types': minor
'@eciperay/server': minor
'@eciperay/client': minor
'@eciperay/web': minor
'@eciperay/app': minor
'@eciperay/mcp-server': minor
---

Remove the recipe status entirely (#610, tranche 2): recipes no longer carry an idea/evolving/perfected/abandoned status. The `RecipeStatus` type and the status field are gone from `@eciperay/types` recipe inputs and details, recipe detail pages and cards no longer show a status badge, the recipe forms and the recipe-list status filter no longer offer a status control, and the `PATCH /recipes/:id` status endpoint is removed. Because perfected/abandoned no longer lock a recipe, every recipe stays editable, and version activation follows the cook-log/archived rule only. The server drops the `recipes.status` column (migration 030), and the MCP recipe-update payload no longer carries a status field.
