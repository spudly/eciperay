---
'@eciperay/server': patch
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Share a link instead of the recipe: tapping Share on a recipe now shares its
Eciperay link (with the recipe title) rather than the full recipe text, and
never links to the source the recipe was imported from. The link works even for
private recipes — opening it shows the full recipe to a guest with a sign-in
option, and a signed-in recipient finds the recipe under "Shared with me".
Private recipes stay private without the link: a guest, or a signed-in recipient
who does not already hold a share grant, needs a valid link to open one. Sharing
again never revokes links already sent — only rotating the link does, and
rotation revokes the old links, not a recipient's existing share grant.
Returning a recipe to private revokes both its issued links and its existing
share grants.
