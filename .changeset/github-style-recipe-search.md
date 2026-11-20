---
'@eciperay/server': minor
'@eciperay/web': minor
'@eciperay/app': minor
---

Recipe search now speaks GitHub-style syntax: plain words match the title,
description, or an ingredient name, and the search box accepts quoted phrases,
field qualifiers (`title:`, `desc:`, `ingredient:`, `tag:`), negation
(`-ingredient:peanuts`), status/scope qualifiers (`status:`, `is:public`), and
numeric comparisons (`calories:<600`, `rating:>=4`) — identically across your
recipes, shared-with-me, and public discovery.
