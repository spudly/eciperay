---
'@eciperay/types': patch
'@eciperay/mcp-server': patch
---

Share @eciperay/types with mcp-server (#682): `RecipeUpdatePatch` now lives in `@eciperay/types` (composed from the shared `IngredientInput`/`InstructionInput`), and mcp-server depends on `@eciperay/types` and imports the shared types instead of re-declaring them locally. The payload/diff logic stays in mcp-server; no behavior changes.
