---
'@eciperay/app': patch
'@eciperay/web': patch
---

Public pages adopt @spudly/ui 7.0.0, which retired the PublicPageFrame (#452):
Discover, the marketing landing, and public recipe pages now render their own
footer from the shared footer data (the Legal column still carries Privacy,
Terms, and Do Not Sell or Share), and the brand wordmark + Sign in header the
frame used to supply is rendered by the host's PublicHeader with the same
destinations (brand → /, Sign in → /login). No public page content or routes
changed.
