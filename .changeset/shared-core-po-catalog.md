---
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Share the core Lingui catalog: the strings both hosts render identically now
live once in @eciperay/client's core .po catalog, each host's catalog keeps
only its host-specific strings, and both hosts merge core + host catalogs at
runtime. No copy changes.
