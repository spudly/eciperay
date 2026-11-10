---
'@eciperay/app': patch
---

The app's Recipes tab is now the unified browse (#412): your own recipes appear
first, followed by the recipes shared with you (badged "Shared", opening their
public permalink, with no log-cook control on shared rows), and the public
Discover catalog appears below in its own section — all under the one
search/filter bar, with each section loading more as you scroll and showing its
own error state if its first page fails. Home's "Shared with me" entry and the
shared-with-me deep link now land on the Recipes tab, and the old standalone
Shared with me screen redirects there.
