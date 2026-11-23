-- "Show less like this" soft negative signal (#623): the user picks a
-- source recipe and discovery down-ranks (never excludes) other recipes
-- similar to it — sharing a tag or the author — until the user undoes
-- the entry from the Settings "Show less like this" list.
--
-- This mirrors recipe_disinterest's shape (migration 030) but is the
-- SOFT counterpart: recipe_disinterest hides one exact recipe outright,
-- while recipe_show_less records a source whose *similar* recipes lose
-- ranking score in the discovery feed (see DISCOVERY_FEED_SQL in
-- discoveryQueries.ts). Entries persist until undone — no decay in v1,
-- exactly like hard hides, so the Settings list never lies about what
-- is active.

create table if not exists recipe_show_less (
  user_id          uuid not null references users(id) on delete cascade,
  source_recipe_id uuid not null references recipes(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (user_id, source_recipe_id)
);

create index if not exists recipe_show_less_source_recipe_id_idx
  on recipe_show_less(source_recipe_id);
