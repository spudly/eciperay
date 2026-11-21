-- Discovery models (#622, tranche 1): saves, hard-hide not-interested,
-- user follows, and soft interest signals.
--
-- saved_recipes is a bookmark, not a copy: the saved recipe stays owned by
-- its author and surfaces in the unified Recipes browse with preferred
-- placement (#409).
--
-- recipe_disinterest is the HARD negative signal: a hidden recipe is
-- excluded from every discovery surface for that user until the user
-- removes it from the Hidden recipes list (unhide). It is distinct from
-- the soft signals in recipe_interest_signals below.
--
-- recipe_interest_signals is the SOFT signal log added by Stephen's
-- approval amendment (2026-11-21): dwell / engagement with a recipe in
-- the swipe deck records 'interest' (NOT a save), and swiping past a
-- recipe quickly records 'disinterest' (NOT a hide). Signals are an
-- append-only history — a user can signal the same recipe more than
-- once — and they feed discovery ranking only: interest raises a recipe,
-- quick-disinterest deprioritises it. Neither signal saves or hides.

create table if not exists saved_recipes (
  user_id    uuid not null references users(id) on delete cascade,
  recipe_id  uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists saved_recipes_recipe_id_idx
  on saved_recipes(recipe_id);

create index if not exists saved_recipes_user_created_idx
  on saved_recipes(user_id, created_at desc);

create table if not exists recipe_disinterest (
  user_id    uuid not null references users(id) on delete cascade,
  recipe_id  uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists recipe_disinterest_recipe_id_idx
  on recipe_disinterest(recipe_id);

create table if not exists user_follows (
  follower_id uuid not null references users(id) on delete cascade,
  followee_id uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists user_follows_followee_idx
  on user_follows(followee_id, created_at desc);

create table if not exists recipe_interest_signals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  recipe_id  uuid not null references recipes(id) on delete cascade,
  signal     text not null check (signal in ('interest', 'disinterest')),
  dwell_ms   integer check (dwell_ms is null or dwell_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists recipe_interest_signals_user_recipe_idx
  on recipe_interest_signals(user_id, recipe_id, created_at desc);

create index if not exists recipe_interest_signals_recipe_idx
  on recipe_interest_signals(recipe_id, signal);
