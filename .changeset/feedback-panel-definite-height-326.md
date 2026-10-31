---
'@eciperay/web': patch
---

Feedback bubble panel: give the open panel a definite height (the form's natural
height, capped by the viewport allowance) instead of only a max-height. The
design-system FeedbackPage's scroll container collapsed to a short sliver with a
clipped "Feedback" heading inside the previously shrink-to-fit panel; the panel
now renders at full form height on tall viewports and still shrinks and scrolls
on short ones.
