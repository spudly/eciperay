-- Community ratings and owner personal star rating

alter table recipes
  add column if not exists star_rating smallint check (star_rating between 1 and 5);

create table if not exists recipe_ratings (
  recipe_id         uuid not null references recipes(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  stars             smallint not null check (stars between 1 and 5),
  content_revision  integer not null,
  created_at        timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index if not exists recipe_ratings_recipe_id_idx on recipe_ratings(recipe_id);
