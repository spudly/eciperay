-- Recipe comments on shared and public recipes

create table if not exists recipe_comments (
  id                uuid primary key default gen_random_uuid(),
  recipe_id         uuid not null references recipes(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  body              text not null,
  content_revision  integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists recipe_comments_recipe_id_idx on recipe_comments(recipe_id);

create trigger recipe_comments_updated_at
  before update on recipe_comments
  for each row execute procedure set_updated_at();
