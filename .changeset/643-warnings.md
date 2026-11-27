---
'@eciperay/client': patch
---

Add recipe warnings (#643 warnings tranche): a shared `computeRecipeWarnings` in `@eciperay/client` detects the two warning kinds from Stephen's 2026-11-21 amendments — an ingredient on the list that the instructions never mention (by stored link or by text mention), and an instruction mentioning a common ingredient that is not on the list (curated lexicon). Recipe owners see the warnings in a banner whenever they view a recipe (web and app detail hosts), and their recipe lists show a very small ⚠ indicator at the end of a warned recipe's subtitle. Non-owners never see warnings.
