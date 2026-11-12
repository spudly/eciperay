-- Cook vs eat servings per entry (#363).
--
-- Every entry that carries servings gains a servings-to-eat twin:
-- meal_recipes and meal_ingredients (meal composition entries) and
-- meal_plan_entries (plan recipe entries; meal entries keep both null,
-- as their `servings` already is). The existing `servings` column keeps
-- its name and becomes servings-to-cook in code/types; the new column is
-- servings_to_eat. Existing rows backfill servings_to_eat = servings so
-- every existing meal and plan keeps identical nutrition until someone
-- edits it (eat = cook reproduces the old numbers exactly).
--
-- Type choice: servings_to_eat mirrors the type and check of the
-- `servings` column it twins (integer, > 0) for consistency with the
-- existing validation, even though the motivating example eats a
-- fractional 1.5 servings — fractional eat servings would need the
-- cook columns re-typed too and are out of this change's scope.

alter table meal_recipes
  add column if not exists servings_to_eat integer;

update meal_recipes
set servings_to_eat = servings
where servings_to_eat is null;

alter table meal_recipes
  alter column servings_to_eat set not null;

alter table meal_recipes
  drop constraint if exists meal_recipes_servings_to_eat_check;

alter table meal_recipes
  add constraint meal_recipes_servings_to_eat_check
  check (servings_to_eat > 0);

alter table meal_ingredients
  add column if not exists servings_to_eat integer;

update meal_ingredients
set servings_to_eat = servings
where servings_to_eat is null;

alter table meal_ingredients
  alter column servings_to_eat set not null;

alter table meal_ingredients
  drop constraint if exists meal_ingredients_servings_to_eat_check;

alter table meal_ingredients
  add constraint meal_ingredients_servings_to_eat_check
  check (servings_to_eat > 0);

alter table meal_plan_entries
  add column if not exists servings_to_eat integer
    check (servings_to_eat is null or servings_to_eat > 0);

update meal_plan_entries
set servings_to_eat = servings
where servings_to_eat is null and servings is not null;
