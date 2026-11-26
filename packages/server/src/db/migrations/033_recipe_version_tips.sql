-- Recipe tips (#635): a version carries a list of short authored cooking
-- tips, rendered on the detail page in array order. Tips are
-- version-scoped authored content with no identity, querying, or sharing
-- needs of their own, so they live in a single JSONB array column on
-- recipe_versions rather than a join table. Existing rows default to an
-- empty array, which reads as "no tips". Caps (10 tips, 280 chars each)
-- and empty-entry dropping are enforced in the save path
-- (lib/recipeTips.ts), not in the schema.

alter table recipe_versions
  add column if not exists tips jsonb not null default '[]'::jsonb;
