---
'@eciperay/server': minor
'@eciperay/types': minor
'@eciperay/client': minor
'@eciperay/web': minor
'@eciperay/app': minor
---

Tag management is admin-only (#621, option B): migration 031 adds a
`users.is_admin` boolean (default false) that defines admin. A new server
`requireAdmin` middleware gates `POST /tags`, `PATCH /tags/:id`, and
`DELETE /tags/:id` with 403 for non-admins, while `GET /tags` stays available to
every signed-in user (tag pickers and filtering read it; recipe save resolves
tag names server-side and is unaffected). The new `GET /auth/me` profile
response exposes the server-computed `isAdmin` flag on the shared `User` type
and client auth API. On web, the Tags nav entry is hidden for non-admins and the
`/tags` route redirects non-admins to `/recipes`; on native, the Tags screen is
not registered and the profile Tags link is hidden for non-admins.
