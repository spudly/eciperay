---
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/client': patch
'@eciperay/server': patch
---

QA polish (#266): meal plan detail now labels its Nutrition goals figures with
what was compared with your daily goals — the plan's per-day average when the
plan has a valid date range ("Per-day average for this plan…" caption on web,
"(per-day avg)" row labels in the app), or the plan total for an undated plan,
whose dates are optional and which the server compares by its whole-plan total
("Plan total for this plan…" caption on web, "(plan total)" row labels in the
app) — so they no longer read as a wrong total next to "Plan total". Cook
History entries can now be deleted: the server gains
`DELETE /recipes/:id/versions/:versionId/cooks/:cookLogId` (own entries only),
the client gains `cookLogs.remove`, and web Cook History shows a Delete control
per entry with an in-page confirmation and an error alert if the delete fails.
