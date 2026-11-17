---
'@eciperay/app': patch
---

Fix the Add tab reopening a completed import's review page: accepting an
import, starting edits on it, or finishing a manual entry now resets the Add
stack to its root before switching to the Recipes tab, so tapping Add starts a
fresh import flow.
