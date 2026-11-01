---
'@eciperay/web': patch
---

Feedback bubble panel: lay the feedback form out as a full-height column so the
host-rendered "Cancel" action is fully visible without scrolling. The
design-system FeedbackPage's scroll container claims the panel's full height
(min-height: 100%), which pushed Cancel a full button-height below the panel's
bottom edge — it rendered partially clipped on tall viewports and needed a
scroll to reveal. The form now reserves Cancel's space in the column: on tall
viewports both "Submit feedback" and "Cancel" are fully visible when the panel
opens, and on short viewports the form scrolls internally while Cancel stays
visible and the "Feedback" heading remains in view.
