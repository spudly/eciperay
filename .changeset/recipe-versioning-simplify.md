---
'@eciperay/types': minor
'@eciperay/server': minor
---

Simplify recipe versioning (#610, tranche 1): an edit that branches from the active version now becomes the current version in the same transaction by default, so editing the current recipe goes live immediately (an explicit `activate: false` still keeps the branched version as a draft; draft-version in-place edits are unchanged). Edits also accept an optional `changeSummary` naming the edit, stored on the branched version's `change_summary` for internal version tracking; `RecipeVersionInput` in `@eciperay/types` gains the optional `changeSummary` field.
