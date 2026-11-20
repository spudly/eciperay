---
'@eciperay/client': patch
'@eciperay/web': patch
---

The consent preferences page (`/privacy/consent`) now carries a
`noindex, nofollow` robots directive through the shared page-head
builder, so both the client-rendered head and the server-rendered head
tell crawlers not to index the utility page. It remains excluded from
the sitemap, and the public pages and public recipes stay indexable.
