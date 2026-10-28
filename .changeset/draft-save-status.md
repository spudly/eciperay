---
'@eciperay/server': patch
'@eciperay/types': patch
---

Fix a recipe's status reverting to Idea after saving a draft version.
Creating a draft from a Perfected recipe reopens it to Evolving and the
version editor shows Evolving in its Status dropdown, but saving the draft
silently reset the recipe's status to Idea: the version-save payload's
status was stripped by the server's version-input validation, and the save
then applied the create-path default. The version input now carries the
editor's chosen status through to the save, and a version save that omits
a status leaves the recipe's current status unchanged instead of
resetting it. On the recipe detail page, a draft saved from a Perfected
recipe now keeps the Evolving status the editor showed.
