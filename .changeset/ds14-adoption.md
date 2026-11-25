---
'@eciperay/web': patch
'@eciperay/app': patch
---

Adopt @spudly/ui 14.0.0 across the web and app hosts: the recipe detail
nutrition section now renders the DS Nutrition Facts label from structured
facts, cook-log forms on the recipe detail and browse pages render through the
DS RatingForm data props, the parsed-recipe preview, profile legal links,
sign-up legal notice, and sharing consent cross as data spans, the profile page
takes its nutrition-goals and access-tokens sections as data props, and the
recipe form drops its status field (the DS form no longer carries one; the
status still saves with the recipe).
