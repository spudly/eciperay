---
'@eciperay/app': patch
'@eciperay/client': patch
'@eciperay/server': patch
---

In the mobile app, an invalid or expired session token during the
authenticated-session lifecycle now ends in the normal signed-out flow instead
of surfacing as an unhandled error. A transient authentication-service outage no
longer signs out a still-valid session (the server answers 503 for a transient
token lookup failure instead of 401, and the unavailable lookup is logged
server-side so the outage is visible to operators).
