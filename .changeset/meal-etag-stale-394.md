---
'@eciperay/server': patch
---

Meal ETags no longer go stale when a member recipe changes: deleting a recipe
now advances the `updated_at` of every meal that contained it, and a recipe
edit — metadata-only (title, servings, image) or a full editable-version
save — advances the member meals' `updated_at` atomically with the save. A
meal's cached copy and its `If-Match` token therefore reflect recipe
deletions and edits instead of silently matching the pre-change meal.
