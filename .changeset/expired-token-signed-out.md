---
'@eciperay/web': patch
'@eciperay/client': patch
'@eciperay/server': patch
---

An invalid or expired session token now ends in the normal signed-out flow
instead of surfacing as an unhandled error. A transient authentication-service
outage no longer signs out a still-valid session (the server answers 503 for a
transient token lookup failure instead of 401), and a session the auth server
reports as gone is treated as an invalid credential.
