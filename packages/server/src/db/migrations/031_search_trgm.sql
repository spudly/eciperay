-- Fuzzy recipe search (#612): trigram similarity on recipe titles and
-- ingredient names powers typo tolerance ("chiken" finds chicken recipes).
-- pg_trgm ships with Supabase Postgres; the GIN trigram indexes keep the
-- similarity conditions in the shared search layer cheap at recipe scale.
-- Description stays exact-only: it is long-form text where trigram
-- similarity produces noise.

create extension if not exists pg_trgm;

create index if not exists recipe_versions_title_trgm_idx
  on recipe_versions using gin (title gin_trgm_ops);

create index if not exists ingredients_name_trgm_idx
  on ingredients using gin (name gin_trgm_ops);
