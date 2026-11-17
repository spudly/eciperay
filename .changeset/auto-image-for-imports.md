---
'@eciperay/server': patch
---

Fix imported recipes never getting an auto-generated image: the
auto-image trigger now fires from the shared save layer, so imports
(URL, text, photo, bulk, and AI create sessions), accepting an import,
and AI tweak-created versions all generate an image for imageless
recipes. A failed or quota-blocked generation attempt no longer burns
the recipe's one attempt — a later save can retry.
