---
'@eciperay/web': patch
---

Web feedback shortcut (#256): the Profile feedback preference now shows the
current analytics consent state (Accepted / Declined / Not set) with an action
to change it in place, instead of help text pointing at a consent banner the
user might never see. Turning the shortcut on always re-presents the consent
prompt — Accept keeps the shortcut on (the floating Feedback button appears),
Decline shows an error and forces the preference back off, so the preference can
no longer be on with no visible effect.
