---
'@eciperay/server': minor
---

Recipe search now tolerates typos and ranks by relevance: free-text words of
four or more characters also match on trigram similarity against recipe
titles and ingredient names (backed by a new `pg_trgm` migration), so
"chiken" finds chicken recipes without flooding exact-match results, and
while a search is present with no explicit sort chosen, results order
best-match-first — title and whole-word matches above ingredient,
description, and fuzzy matches. An explicit sort (newest, rating, satiety,
calories) still wins, identically across your recipes, shared-with-me, and
public discovery.
