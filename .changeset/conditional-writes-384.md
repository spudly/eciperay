---
'@eciperay/server': patch
'@eciperay/types': patch
---

Meal and meal-plan writes are now protected against silent overwrites: the meal
and meal-plan detail responses expose their `updatedAt` value as an `ETag`, and
`PUT /meals/:id` / `PUT /meal-plans/:id` accept that value back — as an
`If-Match` header or as an `expectedUpdatedAt` field in the request body. When
the stored record has changed since the client's read, the PUT fails with `409`
(`Meal has been modified since it was loaded` /
`Meal plan has been modified since it was loaded`) and writes nothing, so the
caller can re-read, re-merge, and retry. Clients that send no token keep the
previous unconditional full-replace behavior.
