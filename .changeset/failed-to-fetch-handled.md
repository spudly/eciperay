---
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

A network-level fetch failure during the authenticated session sync (e.g.
"Failed to fetch" when the API is momentarily unreachable) is now a handled
failure instead of an unhandled exception: createApiClient surfaces it as a
typed network error, and the session lifecycle reports it and keeps the
still-valid session signed in rather than rethrowing it.
