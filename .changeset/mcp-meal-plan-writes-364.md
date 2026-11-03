---
'@eciperay/mcp-server': patch
---

The MCP server can now write meals and meal plans, not just read them: create,
update, and delete meals and meal plans; add and remove recipes in a meal with
per-recipe servings; and add, remove, and reorder meal plan entries (meals or
standalone recipes) with per-entry quantities. New list_meals and get_meal read
tools round out the meal surface, so a full meal plan can be built and
maintained end-to-end through MCP.
