-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Users (mirrors Supabase auth.users)
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  supabase_uid uuid not null unique,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Recipes
create table if not exists recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  title         text not null,
  description   text,
  servings      integer not null default 4,
  prep_time_min integer,
  cook_time_min integer,
  image_url     text,
  star_rating   smallint check (star_rating between 1 and 5),
  source_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on recipes(user_id);

-- Ingredients
create table if not exists ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes(id) on delete cascade,
  sort_order integer not null default 0,
  name       text not null,
  quantity   numeric,
  unit       text,
  notes      text,
  is_optional boolean not null default false
);

create index if not exists ingredients_recipe_id_idx on ingredients(recipe_id);

-- Instructions
create table if not exists instructions (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  step_number integer not null,
  body        text not null
);

create index if not exists instructions_recipe_id_idx on instructions(recipe_id);

-- Tags (preset tags have user_id = null)
create table if not exists tags (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references users(id) on delete cascade,
  name      text not null,
  color     text not null default '#6b7280',
  is_preset boolean not null default false,
  unique(user_id, name)
);

-- Recipe <-> Tag join
create table if not exists recipe_tags (
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- Recipe notes
create table if not exists recipe_notes (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_notes_recipe_id_idx on recipe_notes(recipe_id);

-- AI conversation history (one conversation thread per recipe per user)
create table if not exists ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  messages   jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recipe_id, user_id)
);

-- AI recipe drafts (pending approval)
create table if not exists recipe_drafts (
  id                  uuid primary key default gen_random_uuid(),
  recipe_id           uuid not null references recipes(id) on delete cascade,
  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  snapshot_json       jsonb not null,
  diff_json           jsonb not null,
  trigger             text not null check (trigger in ('ai_chat', 'ai_cleanup')),
  summary_of_changes  text not null,
  created_at          timestamptz not null default now()
);

create index if not exists recipe_drafts_recipe_id_status_idx
  on recipe_drafts(recipe_id, status);

-- Automatically update updated_at on recipes
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_updated_at
  before update on recipes
  for each row execute procedure set_updated_at();

create trigger ai_conversations_updated_at
  before update on ai_conversations
  for each row execute procedure set_updated_at();
