---
'@eciperay/types': minor
'@eciperay/server': minor
---

Cook-mode per-step ingredients, data/API tranche (#643): instructions gain
`ingredientReferences` — the ordered IDs of the same version's ingredients
each step uses (Mealie-style references; the flat ingredient list stays
canonical for scaling, shopping, and nutrition). Migration 033 adds the
`instructions.ingredient_references` JSONB column (empty array for legacy
recipes, which keep rendering the full list). Recipe detail, public detail,
and version detail responses now include the references; create/edit/clone/
import/export write paths round-trip them, ingredient IDs supplied on input
are preserved across version rewrites so references never dangle, clones
carry both ingredient IDs and references over, and a write whose references
name ingredients outside the version is rejected.
