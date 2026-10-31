---
'@eciperay/web': patch
---

Web AI sessions (#295): an in-progress "Generate with AI" or "Tweak with AI"
session is no longer lost when navigating away and back. The web session host
persists the active session's id in localStorage (per flow, and per recipe for
tweaks), re-fetches the session from the server on return, and restores the
prompt conversation and generated plan; stored ids are cleared when the session
is cancelled, finalized, already finished, or no longer resolves.
