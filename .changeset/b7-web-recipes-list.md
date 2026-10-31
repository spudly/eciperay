---
'@eciperay/web': patch
---

The web Recipes list and Shared with me pages now render the design system's
consolidated RecipesPage instead of the web app's own list views (B7 web
adoption, design-system#130): one design-system page serves both screens, with
Shared with me keeping its own empty-state wording. Filters now start collapsed
behind the page's "Add a filter" chooser; further recipes load when the list is
scrolled to the end; a recipe's rating shows as the row's star control (which
opens the inline cook log form) rather than as subtitle text; and the list no
longer offers Delete — deleting a recipe is done from its detail page.
