-- Direct ingredients on meals (#362).
--
-- A meal can contain plain ingredients alongside (or instead of) member
-- recipes, for the parts of a meal that are not a recipe. Direct entries
-- are stored on the meal itself — never as hidden recipes — and are
-- one-off entries in v1 (no promotion to saved ingredients/recipes).
--
-- Nutrition mirrors the recipe-version nutrition shape (migration 013):
-- per-serving macros estimated at save time by the same AI lookup full
-- recipes use (refreshRecipeNutrition / estimateNutritionFromAi), over
-- the entry's name/quantity/unit, plus the whole-entry prepared weight.
-- There are no user-entered nutrition values. `servings` is the
-- entry-level servings (#363 correction: servings live on each recipe or
-- ingredient entry within a meal, not on the meal itself); aggregation
-- scales the stored per-serving macros by it.

create table if not exists meal_ingredients (
  id                   uuid primary key default gen_random_uuid(),
  meal_id              uuid not null references meals(id) on delete cascade,
  name                 text not null,
  quantity             double precision check (quantity is null or quantity > 0),
  unit                 text,
  servings             integer not null default 1 check (servings > 0),
  sort_order           integer not null default 0,
  calories             double precision,
  protein_g            double precision,
  carbs_g              double precision,
  fat_g                double precision,
  fiber_g              double precision,
  sugar_g              double precision,
  sodium_mg            double precision,
  prepared_weight_g    double precision,
  satiety_score        smallint
    check (satiety_score is null or satiety_score between 0 and 100),
  nutrition_status     text
    check (
      nutrition_status is null
      or nutrition_status in ('pending', 'ready', 'failed')
    ),
  nutrition_disclaimer text,
  nutrition_updated_at timestamptz
);

create index if not exists meal_ingredients_meal_id_idx
  on meal_ingredients (meal_id);
