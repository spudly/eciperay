---
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Auth forms now validate the email address before submitting (#461): on sign-in,
sign-up, and forgot-password (web and native), a malformed email shows "Enter a
valid email address" under the email field and no auth request is made, instead
of surfacing the generic invalid-credentials error. Well-formed emails behave
exactly as before. The forms render through @spudly/ui 9.1.0, whose auth pages
accept the field-level `emailError` prop this validation uses.
