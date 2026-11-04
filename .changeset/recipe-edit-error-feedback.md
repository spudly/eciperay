---
'@eciperay/web': patch
---

Recipe edit failures are no longer silent (#418): when the API rejects a recipe change — for example activating a version, changing status, creating a version or draft, saving sharing settings, rating, or posting/editing/deleting a comment on a recipe that cannot be modified in its current status — the web app now shows the server's reason in the page's action feedback (or, for comments, an inline error that keeps the draft text), and a rejected sharing change no longer stays selected as if it had saved. The recipe edit form's rejected-save path is covered by regression tests.
