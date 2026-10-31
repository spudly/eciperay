---
'@eciperay/web': patch
---

The web recipe form pages (manual entry, edit recipe, edit version) now render
the design system RecipeFormPage and its EditRecipePage / ManualEntryPage /
EditVersionPage shells (@spudly/ui) instead of the web app's own form and shell
implementations (B7 web adoption cluster C8, design-system#130). The web host
keeps the form state, tags query, image upload/generation, and parent-version
diffing; the image field and the drag-to-sort ingredient/instruction lists stay
web-side as the pages' slot implementations, as in the native app. Form copy
follows the design system pages the app already ships.
