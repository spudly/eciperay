---
'@eciperay/app': patch
'@eciperay/mcp-server': patch
---

Meals can now carry direct ingredients on native and through the MCP tools,
completing the direct-ingredients feature (#362): the native meal detail screen
lists a meal's direct ingredients with quantity, servings, and servings-scaled
nutrition, the native meal form can add, edit, and remove direct ingredients and
can save a meal built from direct ingredients alone, and the MCP `create_meal` /
`update_meal` tools accept an `ingredients` list (at least one recipe or direct
ingredient is required; omitting the list on update preserves the stored
ingredients).
