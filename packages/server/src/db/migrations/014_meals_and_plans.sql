-- Meals, meal plans, step timing cache, and user nutrition goals

create table if not exists meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  title      text not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_id_idx on meals (user_id);

create table if not exists meal_recipes (
  meal_id    uuid not null references meals(id) on delete cascade,
  recipe_id  uuid not null references recipes(id) on delete cascade,
  sort_order integer not null default 0,
  servings   integer not null check (servings > 0),
  primary key (meal_id, recipe_id)
);

create index if not exists meal_recipes_recipe_id_idx on meal_recipes (recipe_id);

create table if not exists meal_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  title      text not null,
  notes      text,
  starts_on  date,
  ends_on    date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    starts_on is null
    or ends_on is null
    or ends_on >= starts_on
  )
);

create index if not exists meal_plans_user_id_idx on meal_plans (user_id);

create table if not exists meal_plan_entries (
  id           uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  sort_order   integer not null default 0,
  quantity     integer not null default 1 check (quantity >= 1),
  meal_id      uuid references meals(id) on delete restrict,
  recipe_id    uuid references recipes(id) on delete cascade,
  servings     integer check (servings is null or servings > 0),
  check (
    (meal_id is not null and recipe_id is null and servings is null)
    or (meal_id is null and recipe_id is not null)
  )
);

create unique index if not exists meal_plan_entries_meal_uidx
  on meal_plan_entries (meal_plan_id, meal_id)
  where meal_id is not null;

create unique index if not exists meal_plan_entries_recipe_uidx
  on meal_plan_entries (meal_plan_id, recipe_id)
  where recipe_id is not null;

create index if not exists meal_plan_entries_meal_plan_id_idx
  on meal_plan_entries (meal_plan_id);

create index if not exists meal_plan_entries_meal_id_idx
  on meal_plan_entries (meal_id)
  where meal_id is not null;

alter table instructions
  add column if not exists estimated_duration_min integer
    check (
      estimated_duration_min is null
      or estimated_duration_min >= 0
    );

alter table recipe_versions
  add column if not exists step_timing_status text
    check (
      step_timing_status is null
      or step_timing_status in ('pending', 'ready', 'failed')
    ),
  add column if not exists step_timing_updated_at timestamptz;

alter table users
  add column if not exists goal_calories double precision
    check (goal_calories is null or goal_calories >= 0),
  add column if not exists goal_protein_g double precision
    check (goal_protein_g is null or goal_protein_g >= 0),
  add column if not exists goal_carbs_g double precision
    check (goal_carbs_g is null or goal_carbs_g >= 0),
  add column if not exists goal_fat_g double precision
    check (goal_fat_g is null or goal_fat_g >= 0),
  add column if not exists goal_satiety_score smallint
    check (
      goal_satiety_score is null
      or goal_satiety_score between 0 and 100
    );
