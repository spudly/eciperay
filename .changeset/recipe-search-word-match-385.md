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
only when its words appeared in the title as one contiguous phrase in the same
order and spacing, so a multi-word picker search could find nothing even though
the recipe existed — the "First Soup" search that missed "QA — First Soup" in
#385. Single-word searches behave as before (any part of the title matches, not
only a prefix), and the meal half of the meal-plan picker matches meal titles
with the same word-by-word rule.
