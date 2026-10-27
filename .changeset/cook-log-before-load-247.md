---
'@eciperay/web': patch
'@eciperay/app': patch
---

Cooking mode no longer loses a cook log submitted before the recipe loads.
Opening cooking mode directly (without a version in the URL) on a slow
connection previously rendered the step controls and the cook log form before
the recipe arrived, and submitting in that window posted the cook log to an
empty-version URL, silently losing it. The cooking view (web page and native
screen) now stays on the loading gate until the recipe has loaded, so the cook
log form can only be reached with a resolved version.
