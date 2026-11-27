---
'@eciperay/web': minor
'@eciperay/client': patch
---

One unified recipe page host (#649, tranche 2): the public permalink
`/recipe/:id/:slug` and the app route `/recipes/:recipeId[/:slug]` now render
the same host, which renders the design system's single RecipeDetailPage for
every viewer — the owner form for the owner (edit, versions, sharing, delete,
tweak), the guest form's signed-in variant for a signed-in non-owner
(save-a-copy, ratings, comments where access allows), and the guest form's
signed-out variant for a signed-out visitor (sign-in CTA, no actions). A
private recipe the viewer cannot access, or a missing recipe, renders the DS
page's notFound / unavailable treatment, keyed only off the fetch result. The
retired PublicRecipePage host is deleted; canonical/SEO is unchanged (the
canonical link and sitemap keep pointing at `/recipe/:id/:slug`, no redirects
added). A signed-in user following a public link now stays on the recipe with
the signed-in treatment instead of a sign-in detour. The client's
authenticated recipe fetch gains an optional share token, so the `t` token on
a shared link is honored on the unified page's data path as it already was on
the public route.
