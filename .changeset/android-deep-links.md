---
'@eciperay/app': patch
---

Android deep links now open the matching in-app screen (#484): the manifest
delivers every URL under the app's own scheme to MainActivity (previously only
the `auth` host was registered, so other links failed with "No Activity found to
handle Intent"), the navigation linking config lives in its own module covering
both the production and dev schemes, and in-app URL opens go through a helper
that swallows a failed open instead of leaking an unhandled rejection.
