---
'@eciperay/client': patch
'@eciperay/server': patch
---

Recipe search in the meal and meal-plan recipe pickers (and in the recipe list,
shared-with-me list, and public discovery) now matches word by word: every word
of the search text must appear somewhere in the recipe's title as a
case-insensitive substring. Searching "First" or "First Soup" now finds "QA —
First Soup" — previously a multi-word search only matched when the whole phrase
appeared verbatim in the title, so "First Soup" found nothing even though the
recipe existed (#385). Single-word searches behave as before (any part of the
title matches, not only a prefix), and the meal half of the meal-plan picker
matches meal titles with the same word-by-word rule.
