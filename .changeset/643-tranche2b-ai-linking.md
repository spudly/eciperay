---
'@eciperay/server': patch
---

Add the AI ingredient-linking pass (#643 tranche 2b): `POST /recipes/:id/ai/link-ingredients` takes a version's ingredients and instructions, seeds Claude with the deterministic matcher's baseline map, and returns a validated proposal — the union of matcher and AI links, with collective/pronoun references ("add the vegetables") completed by the model, unknown ids dropped, and unreferenced ingredients reported. Proposals are never stored silently; the author accepts them through the normal save path.
