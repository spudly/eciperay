---
'@eciperay/web': patch
---

Meal detail page: show the "Page not found" state for a nonexistent or deleted
meal and the generic "Something went wrong" state for other load failures
(including a failed refetch over a cached meal), instead of hanging on the
loading skeleton indefinitely.
