---
'@eciperay/web': patch
---

Meal plans list (web): a deleted meal plan no longer lingers in the list until a
reload — the list refetches when you navigate back to it, and deleting a plan
from the list drops its row from the cached list immediately.
