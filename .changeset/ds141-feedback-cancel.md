---
'@eciperay/web': patch
'@eciperay/app': patch
---

Adopt @spudly/ui 14.1.0 across the web and app hosts: the feedback form's
Cancel button is now rendered by the DS FeedbackPage from the host's cancel
handler (passed as a data prop), and the web host no longer renders its own
Cancel button under the page.
