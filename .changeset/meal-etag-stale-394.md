---
'@eciperay/server': patch
---

Meal ETags no longer go stale when a member recipe changes: deleting a recipe
now advances the `updated_at` of every meal that contained it, and a
metadata-only recipe edit (title, servings, image) advances the member meals'
`updated_at` atomically with the save. A meal's cached copy and its `If-Match`
token therefore reflect recipe deletions and metadata edits instead of silently
matching the pre-change meal.
