---
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Move the profile/recipe data hooks into @eciperay/client (#676): the access-tokens, recipe sharing, and recipe comments props hooks and useDeleteRecipe now live once in the client package, taking the typed client as a parameter, with hosts keeping only surface-specific extras (share execution, confirmation dialogs, navigation) at the edges. The app's typed client export is renamed from `api` to `eciperay`, matching web. No behavior change on either platform.
