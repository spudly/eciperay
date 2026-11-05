---
'@eciperay/mcp-server': patch
---

MCP `update_recipe` can now edit recipe ingredients and instructions (#410):
pass `versionId` (from `get_recipe`) naming the version to edit, and the change
is applied atomically — an editable draft version is edited in place, while
naming the active version branches a new version from it and leaves the original
untouched in history. Metadata fields in the same call land on the same version.
The edited version stays a draft by default; pass `activate: true` to make it
active. Metadata-only updates behave exactly as before.
