# @eciperay/mcp-server

## 1.34.1

### Patch Changes

- 6c51c21: MCP `update_recipe` can now edit recipe ingredients and instructions
  (#410): pass `versionId` (from `get_recipe`) naming the version to edit, and
  the change is applied atomically — an editable draft version is edited in
  place, while naming the active version branches a new version from it and
  leaves the original untouched in history. Metadata fields in the same call
  land on the same version. The edited version stays a draft by default; pass
  `activate: true` to make it active. Metadata-only updates behave exactly as
  before.

## 1.34.0

### Patch Changes

- bdb63f2: The MCP server can now write meals and meal plans, not just read
  them: create, update, and delete meals and meal plans; add and remove recipes
  in a meal with per-recipe servings; and add, remove, and reorder meal plan
  entries (meals or standalone recipes) with per-entry quantities. New
  list_meals and get_meal read tools round out the meal surface, so a full meal
  plan can be built and maintained end-to-end through MCP.
