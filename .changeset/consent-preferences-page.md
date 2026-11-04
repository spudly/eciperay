---
'@eciperay/web': patch
---

Consent management (#408): a new privacy choices page at `/privacy/consent` lets
any visitor accept, decline, or withdraw analytics consent at any time — changes
take effect immediately without a reload, and withdrawing returns the browser to
the undecided state so the consent banner re-presents. The "Do Not Sell or Share
My Personal Information" footer link opens the page, and Profile preferences
gain a withdraw action plus a link to the page.
