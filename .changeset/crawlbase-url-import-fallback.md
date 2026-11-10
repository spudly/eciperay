---
'@eciperay/server': patch
---

URL imports now fall back to the Crawlbase proxy when a recipe site blocks the direct fetch (#476): the direct fetch (including the browser-header retry for bot refusals) runs first, and Crawlbase is used only after it fails, so proxy tokens are spent only on blocked pages. When the optional `CRAWLBASE_TOKEN` Fly secret is not set, imports behave exactly as before.
