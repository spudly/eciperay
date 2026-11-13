-- Nutrition goal ranges (#521): each daily goal becomes an optional
-- min/max range instead of a single target. Both bounds are optional
-- independently — a goal may set only a min, only a max, both, or neither.
--
-- Backfill preserves today's behavior exactly (option A): the old macro
-- band was on-track within ±10% of the single goal, so an existing macro
-- goal becomes min = 90% / max = 110% of the old value; satiety was a
-- floor (at-or-above = on track), so an existing satiety goal becomes
-- min = old value with max unset. The five legacy columns are dropped —
-- the API shape and the storage shape stay one-to-one.

alter table users
  add column if not exists goal_calories_min double precision
    check (goal_calories_min is null or goal_calories_min >= 0),
  add column if not exists goal_calories_max double precision
    check (goal_calories_max is null or goal_calories_max >= 0),
  add column if not exists goal_protein_g_min double precision
    check (goal_protein_g_min is null or goal_protein_g_min >= 0),
  add column if not exists goal_protein_g_max double precision
    check (goal_protein_g_max is null or goal_protein_g_max >= 0),
  add column if not exists goal_carbs_g_min double precision
    check (goal_carbs_g_min is null or goal_carbs_g_min >= 0),
  add column if not exists goal_carbs_g_max double precision
    check (goal_carbs_g_max is null or goal_carbs_g_max >= 0),
  add column if not exists goal_fat_g_min double precision
    check (goal_fat_g_min is null or goal_fat_g_min >= 0),
  add column if not exists goal_fat_g_max double precision
    check (goal_fat_g_max is null or goal_fat_g_max >= 0),
  add column if not exists goal_satiety_score_min smallint
    check (
      goal_satiety_score_min is null
      or goal_satiety_score_min between 0 and 100
    ),
  add column if not exists goal_satiety_score_max smallint
    check (
      goal_satiety_score_max is null
      or goal_satiety_score_max between 0 and 100
    );

update users
set goal_calories_min = goal_calories * 0.9,
    goal_calories_max = goal_calories * 1.1
where goal_calories is not null;

update users
set goal_protein_g_min = goal_protein_g * 0.9,
    goal_protein_g_max = goal_protein_g * 1.1
where goal_protein_g is not null;

update users
set goal_carbs_g_min = goal_carbs_g * 0.9,
    goal_carbs_g_max = goal_carbs_g * 1.1
where goal_carbs_g is not null;

update users
set goal_fat_g_min = goal_fat_g * 0.9,
    goal_fat_g_max = goal_fat_g * 1.1
where goal_fat_g is not null;

update users
set goal_satiety_score_min = goal_satiety_score
where goal_satiety_score is not null;

-- Per-field min <= max backstops (the server schema rejects min > max
-- first; these keep direct writes honest too).
alter table users
  drop constraint if exists users_goal_calories_range_check;
alter table users
  add constraint users_goal_calories_range_check
  check (
    goal_calories_min is null
    or goal_calories_max is null
    or goal_calories_min <= goal_calories_max
  );

alter table users
  drop constraint if exists users_goal_protein_g_range_check;
alter table users
  add constraint users_goal_protein_g_range_check
  check (
    goal_protein_g_min is null
    or goal_protein_g_max is null
    or goal_protein_g_min <= goal_protein_g_max
  );

alter table users
  drop constraint if exists users_goal_carbs_g_range_check;
alter table users
  add constraint users_goal_carbs_g_range_check
  check (
    goal_carbs_g_min is null
    or goal_carbs_g_max is null
    or goal_carbs_g_min <= goal_carbs_g_max
  );

alter table users
  drop constraint if exists users_goal_fat_g_range_check;
alter table users
  add constraint users_goal_fat_g_range_check
  check (
    goal_fat_g_min is null
    or goal_fat_g_max is null
    or goal_fat_g_min <= goal_fat_g_max
  );

alter table users
  drop constraint if exists users_goal_satiety_score_range_check;
alter table users
  add constraint users_goal_satiety_score_range_check
  check (
    goal_satiety_score_min is null
    or goal_satiety_score_max is null
    or goal_satiety_score_min <= goal_satiety_score_max
  );

alter table users
  drop column if exists goal_calories,
  drop column if exists goal_protein_g,
  drop column if exists goal_carbs_g,
  drop column if exists goal_fat_g,
  drop column if exists goal_satiety_score;
