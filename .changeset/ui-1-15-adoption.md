---
'@eciperay/web': patch
'@eciperay/app': patch
---

Both apps now consume @spudly/ui 1.15.0. The bump's design-system contract
changes are adopted end to end: page navigation renders as real links (hrefs on
web, deep links in the app) instead of press callbacks; the cook log renders the
RatingForm; tag colors are chosen from the named color set; the shared-with-me
list renders the shared RecipesPage. The release also carries the design
system's accessibility fixes: form field labels are properly associated with
their inputs on web, the star rating is operable by assistive tech, and page and
section titles expose a single heading each.
