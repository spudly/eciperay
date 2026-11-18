---
'@eciperay/web': patch
'@eciperay/app': patch
---

Meal plan detail goal-progress copy now comes from the apps' Lingui
catalogs: the below-goal / above-goal / on-track band labels, the
at-least / up-to goal range qualifiers, the per-day-average and plan-total
row qualifiers, and the satiety row label render in the active locale
(including the en-XA pseudo-locale), laying the groundwork for translated
page copy. This is batch 4 of the #465 copy migration (tranche 17); the
remaining batch-4 tranches follow in the same pull request.
