-- Recipe share grants for "Shared with me"

create table if not exists recipe_share_grants (
  recipe_id   uuid not null references recipes(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  via         text not null check (via in ('link', 'explicit')),
  primary key (recipe_id, user_id)
);

create index if not exists recipe_share_grants_user_granted_idx
  on recipe_share_grants(user_id, granted_at desc);
