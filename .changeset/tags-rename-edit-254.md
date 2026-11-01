---
'@eciperay/web': patch
'@eciperay/app': patch
---

Tags can now be renamed and recolored in place on the web Tags page and the
native Tags screen: each tag row gains an Edit action that opens an inline form
pre-filled with the tag's current name and color, and Save applies the change
through the tags update endpoint — no more delete-and-recreate to fix a tag name
(#254).
