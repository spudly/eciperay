-- Servings-to-cook may be 0 (#540): a leftover entry cooks nothing, but
-- the cook columns' `> 0` checks made 0 unrepresentable, so leftover
-- meals inflated the shopping list. Relax the cook checks to >= 0 on
-- meal_recipes, meal_ingredients, and meal_plan_entries. (Renumbered
-- 025 -> 026: migration 025 is the servings-to-eat change from #541,
-- which merged first.)

alter table meal_recipes
  drop constraint if exists meal_recipes_servings_check;

alter table meal_recipes
  add constraint meal_recipes_servings_check
  check (servings >= 0);

alter table meal_ingredients
  drop constraint if exists meal_ingredients_servings_check;

alter table meal_ingredients
  add constraint meal_ingredients_servings_check
  check (servings >= 0);

alter table meal_plan_entries
  drop constraint if exists meal_plan_entries_servings_check;

alter table meal_plan_entries
  add constraint meal_plan_entries_servings_check
  check (servings is null or servings >= 0);
