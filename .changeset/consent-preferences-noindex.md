---
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
---

The consent preferences page (`/privacy/consent`) now carries a
`noindex, nofollow` robots directive from the shared page-head
builder: the client head renders it, and the server injects the same
directive into the served HTML for that path, so crawlers are told
not to index the utility page even without executing JavaScript. It
remains excluded from the sitemap, and the public pages and public
recipes stay indexable.
