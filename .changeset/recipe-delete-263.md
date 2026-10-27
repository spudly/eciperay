---
'@eciperay/web': patch
---

Recipe deletion on web works again: the recipe list and Home card Delete buttons
no longer gate on `window.confirm` (suppressed dialogs made Delete a silent
no-op) — they confirm in-page with Confirm delete / Cancel, a failed delete now
shows an error and keeps the recipe listed, and the recipe detail page gains the
Delete control it was missing, returning to the list after a successful delete.
