---
'@eciperay/server': minor
'@eciperay/types': minor
---

Family sharing, server core (#617, tranche 1): owners can designate one other account for family sharing via GET/POST/DELETE /account/family-sharing. A standing family_share_grants row gives the recipient view/clone access to the owner's whole recipe library — existing and future recipes, private included — through the central share-access check, and the Shared With Me list unions family-shared recipes with a `family` marker (an individual grant wins the badge when both exist). Revoking the designation deletes the row and ends family access immediately; per-recipe grants are unaffected. Account export now includes family share designations.
