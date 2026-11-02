---
'@eciperay/web': patch
---

Recipe detail page (web): a failed nutrition estimate/refresh now surfaces in a
modal dialog ("Could not refresh nutrition — Please try again.") that stays
visible until dismissed, instead of an overview banner at the top of the page
that rendered out of view from the nutrition panel at the bottom and cleared
after 2.5 seconds.
