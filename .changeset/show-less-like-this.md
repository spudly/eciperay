---
'@eciperay/server': minor
'@eciperay/types': minor
'@eciperay/client': minor
'@eciperay/web': minor
'@eciperay/app': minor
---

"Show less like this" (#623): a new soft negative signal for discovery.
Migration 032 adds `recipe_show_less` (user + source recipe, mirroring
the hard-hide `recipe_disinterest` shape). Choosing "Show less like
this" on a recipe records it as a source, and the discovery feed now
down-ranks other recipes similar to a source — sharing a tag or the
same author — by 2 points per matching source, capped at 6, so similar
recipes appear less often but are never removed. The source recipe
itself is not penalised, an explicit save or cook of a recipe cancels
its penalty, and hard hide still excludes outright. New authenticated
routes (`POST`/`DELETE /discovery/recipes/:id/show-less`,
`GET /discovery/show-less`) back a new Settings "Show less like this"
list in the web and native profile screens, next to Hidden recipes,
where each entry can be undone — entries persist until undone, with no
decay. The card-menu action itself is pending a design-system slot for
discovery-card actions (the DS discovery item carries no action props
today); the client API (`eciperay.discovery`) ships ready for it.
