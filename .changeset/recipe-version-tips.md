---
'@eciperay/types': minor
'@eciperay/server': minor
'@eciperay/mcp-server': minor
---

Recipe version tips, data/server/MCP (#635, tranche 1): a recipe version now carries a list of short authored cooking tips. `RecipeVersionDetail` gains `tips: string[]` and the version/recipe inputs gain optional `tips`, stored in a new `recipe_versions.tips` JSONB column (migration 033, default empty). Version create/update/clone/restore paths read and write the list — each tip capped at 280 characters, at most 10 per version, empty entries dropped — and bulk export/import records carry it. The MCP `create_recipe` and `update_recipe` tools accept a `tips` list (updates replace the stored list and, like ingredient/instruction changes, require a versionId). The edit-form UI and detail-page display land in later tranches.
