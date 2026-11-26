---
'@eciperay/web': patch
---

Header brand mark restored (#620): the app shell and the shared BigFooter now pass `mark: 'eciperay'` in their brand data, so @spudly/ui renders the DS-owned Eciperay graphic mark beside the wordmark in the signed-in header and the public footer again. The mark is decorative — the brand link's accessible name stays "Eciperay".
