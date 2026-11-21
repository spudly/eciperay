---
'@eciperay/server': minor
'@eciperay/types': minor
---

Discovery models, server core (#622, tranche 1): migration 030 adds
`saved_recipes` (bookmark saves), `recipe_disinterest` (hard hide — excluded
from every discovery surface until unhidden), `user_follows`, and
`recipe_interest_signals` (soft engagement signals from Stephen's approval
amendment: dwell/engagement records interest, not a save; a quick swipe-past
records disinterest, not a hide). New authenticated `/discovery` routes cover
save/unsave, hide/unhide plus the hidden list, follow/unfollow plus the
following list, recording an interest signal, and a discovery feed query that
excludes the requester's hidden recipes, respects recipe visibility (public
only), and ranks followee-authored, followee-saved, and followee-highly-rated
recipes and interest-signaled recipes higher while deprioritising recipes the
requester last signaled quick disinterest in.
