---
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Add the editor ingredient-linking correction UI (#643 tranche 2c): the recipe editor (web and native) now shows which ingredients each instruction step references, warns about named ingredients no step references, and offers a Mealie-style per-step checklist walk-through to add or remove links, plus a "Suggest links with AI" action that applies the tranche 2b linking proposal to the form. Links persist through the normal recipe save path; recipe detail now round-trips ingredient IDs and instruction `ingredientReferences` into the form so existing links survive an edit, and removing an ingredient strips its links from every step.
