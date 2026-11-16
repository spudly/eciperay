-- Servings-to-eat may be 0 or fractional (#541): someone at the meal
-- may eat none of an entry, or a fractional serving (the motivating
-- #363 example eats 1.5 servings). The eat columns were integer with a
-- `> 0` check, mirroring the cook columns, so 0 and fractions were
-- unrepresentable. Re-type servings_to_eat to numeric and relax its
-- checks to >= 0 on meal_recipes, meal_ingredients, and
-- meal_plan_entries. Servings-to-cook keeps its integer type and
-- checks — only the eat side changes.
--
-- Note: node-postgres returns numeric columns as strings, so the
-- read paths parse servings_to_eat back to a number (see
-- loadMealDetail / loadMealPlanDetail).

alter table meal_recipes
  drop constraint if exists meal_recipes_servings_to_eat_check;

alter table meal_recipes
  alter column servings_to_eat type numeric;

alter table meal_recipes
  add constraint meal_recipes_servings_to_eat_check
  check (servings_to_eat >= 0);

alter table meal_ingredients
  drop constraint if exists meal_ingredients_servings_to_eat_check;

alter table meal_ingredients
  alter column servings_to_eat type numeric;

alter table meal_ingredients
  add constraint meal_ingredients_servings_to_eat_check
  check (servings_to_eat >= 0);

alter table meal_plan_entries
  drop constraint if exists meal_plan_entries_servings_to_eat_check;

alter table meal_plan_entries
  alter column servings_to_eat type numeric;

alter table meal_plan_entries
  add constraint meal_plan_entries_servings_to_eat_check
  check (servings_to_eat is null or servings_to_eat >= 0);
