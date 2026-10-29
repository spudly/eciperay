---
'@eciperay/web': patch
---

The web Home page now renders the design system HomePage (@spudly/ui) instead of
the web app's own view (B7 web adoption, design-system#130). The recently-viewed
recipe cards keep their in-page delete confirmation and error, and their Log
cook form is now the design system CookLogForm the native app already uses — its
notes field is labeled "Notes from this cook (optional)" and its save button
reads "Save".
