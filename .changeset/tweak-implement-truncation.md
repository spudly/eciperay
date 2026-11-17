---
'@eciperay/server': patch
---

Fix "Tweak with AI" failing with a generic 502 when approving a plan
on long imported recipes: the implement step now gets a larger token
budget (16384 instead of 4096), a response that still truncates returns
a specific "Recipe too large to implement in one pass" error instead of
the generic failure, and tweak planning/implementation failures are now
logged with the session and recipe ids so the next failure is
diagnosable.
