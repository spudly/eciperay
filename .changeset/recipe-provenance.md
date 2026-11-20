---
'@eciperay/types': minor
'@eciperay/server': minor
---

Track recipe provenance at creation (#609, tranche 1): migration 029 adds `recipes.provenance_source`/`provenance_detail` with a backfill from each recipe's first version; the shared save path now derives and validates provenance from the creation path (URL imports must record a valid source URL) and applies public-by-default visibility for new recipes (shared clones and unattributed `other` stay private). Recipe detail responses now carry the recipe's provenance.
