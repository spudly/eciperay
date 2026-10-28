---
'@eciperay/server': patch
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/client': patch
---

A Perfected recipe can now be changed again: its detail page offers a Create
draft action (web) / the Edit draft chip (app) that clones the locked active
version into a new draft and opens it in the version editor. Creating the draft
reopens the recipe to Evolving so the draft can actually be edited and saved,
instead of the detail page offering no Edit control and the edit form failing
with "Recipe cannot be modified in its current status". Abandoned recipes remain
locked.
