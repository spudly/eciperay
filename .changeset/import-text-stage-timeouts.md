---
'@eciperay/server': patch
---

Text recipe imports can no longer hang indefinitely (#492): every awaited stage of POST /api/recipes/import/text — the AI parse, recipe preparation, the save, and the imported-image download/upload — now has an explicit time bound. A stage that breaches its bound fails fast with a retryable error (or, for the image stage, completes the import without an image) instead of holding the response past the caller's timeout.
