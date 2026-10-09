-- Persist AI nutrition estimates and computed satiety on recipe versions

alter table recipe_versions
  add column if not exists calories double precision,
  add column if not exists protein_g double precision,
  add column if not exists carbs_g double precision,
  add column if not exists fat_g double precision,
  add column if not exists fiber_g double precision,
  add column if not exists sugar_g double precision,
  add column if not exists sodium_mg double precision,
  add column if not exists prepared_weight_g double precision,
  add column if not exists satiety_score smallint
    check (satiety_score is null or satiety_score between 0 and 100),
  add column if not exists nutrition_status text
    check (
      nutrition_status is null
      or nutrition_status in ('pending', 'ready', 'failed')
    ),
  add column if not exists nutrition_disclaimer text,
  add column if not exists nutrition_updated_at timestamptz;

create index if not exists recipe_versions_satiety_score_idx
  on recipe_versions (satiety_score)
  where satiety_score is not null;

create index if not exists recipe_versions_calories_idx
  on recipe_versions (calories)
  where calories is not null;
