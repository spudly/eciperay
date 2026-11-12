---
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/types': patch
---

Complete Google Recipe structured data (#411): public recipe JSON-LD now
includes totalTime, author, datePublished, recipeCategory/recipeCuisine and
keywords from the displayed tags, and per-serving nutrition; Discover emits an
ItemList of its listed public recipes. Recipe authors control the name shown on
their published recipes from their profile (name + show/hide), backed by a new
`show_author_on_public_recipes` user setting that gates the author name on
public recipe payloads.
