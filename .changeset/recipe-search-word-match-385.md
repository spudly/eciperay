---
'@eciperay/client': patch
'@eciperay/server': patch
---

Recipe search in the meal and meal-plan recipe pickers (and in the recipe list,
shared-with-me list, and public discovery) now matches word by word: every word
of the search text must appear somewhere in the recipe's title as a
case-insensitive substring — on public discovery, in the title or the
description — whatever order or spacing separates them, and irregular whitespace
in the search text is collapsed before matching. Previously a search matched
only when its words appeared as one contiguous phrase in the same order and
spacing — in the title on the picker and list surfaces, or in the title or the
description on public discovery — so a multi-word search could miss a recipe
whose title held the same words separated by other words or punctuation, in a
different order, or with different spacing — the class of picker miss
investigated in #385. Single-word searches behave as before (any part of the
title matches, not only a prefix), and the meal half of the meal-plan picker
matches meal titles with the same word-by-word rule.
