-- Meal ETag freshness when a member recipe is deleted (#394).
--
-- A meal's updated_at is its optimistic-concurrency / ETag token (#384),
-- and meal detail reads its member recipes' metadata. Deleting a recipe
-- removes its meal_recipes rows (directly, or via the account-deletion
-- cascade from users), changing a meal's members while the meal's
-- updated_at stayed the same, so a stale token could pass an If-Match
-- check and If-None-Match could return a false 304.
--
-- This AFTER DELETE row trigger advances the parent meal's updated_at
-- whenever a meal_recipes row is removed, covering every deletion path
-- and cascade. The update is a plain UPDATE: when the parent meal itself
-- is being deleted in the same cascade (e.g. account deletion removes
-- the meal too), it simply matches no row — it never errors and never
-- resurrects the meal.
--
-- The new value is monotonic at the token's millisecond precision
-- (greatest(now(), previous + 1ms)), mirroring the meal replace path in
-- saveMeal, so the token always changes even when the deletion lands in
-- the same millisecond as the meal's previous update.

create or replace function touch_meal_on_meal_recipe_delete()
returns trigger language plpgsql as $$
begin
  update meals
  set updated_at = greatest(
    now(),
    date_trunc('milliseconds', updated_at) + interval '1 millisecond'
  )
  where id = old.meal_id;
  return old;
end;
$$;

drop trigger if exists meal_recipes_touch_meal_on_delete on meal_recipes;

create trigger meal_recipes_touch_meal_on_delete
  after delete on meal_recipes
  for each row execute procedure touch_meal_on_meal_recipe_delete();
