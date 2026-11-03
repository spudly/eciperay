---
'@eciperay/app': patch
---

App recipe lists no longer cycle automatic pagination retries after a failed
next page (#371): on the Recipes and Shared with me screens, a failed next-page
load now stops automatic loading and shows an error alert under the list
("Couldn't load more recipes.") with a "Try again" action that retries the
failed page manually — mirroring the web hosts' fix in #319.
