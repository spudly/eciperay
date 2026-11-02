---
'@eciperay/web': patch
---

Feedback bubble panel (#316): the floating feedback panel is now constrained to
the viewport height and scrolls internally, so on short viewports (e.g. 320×568)
or at 200% zoom every field and both actions (Cancel and Submit feedback) stay
reachable instead of the top of the form being cut off.
