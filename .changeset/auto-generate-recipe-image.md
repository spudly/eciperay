---
'@eciperay/server': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Saving a recipe without an image now generates one automatically (#407): on any
save (create or edit, from web, app, or MCP) of a recipe that currently has no
image, the server generates an image with the existing AI generation machinery
and attaches it — asynchronously, so the save never waits on or fails because of
generation, and at most once per recipe. Recipe photos can now be replaced but
no longer deleted: the Remove image action is gone from the web and app recipe
forms, so once a recipe has an image it keeps one.
