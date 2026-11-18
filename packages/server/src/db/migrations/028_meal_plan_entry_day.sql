-- Optional day assignment for meal plan entries (#539).
--
-- A plan entry may name the calendar day it belongs to (`day`, a plain
-- date with no time or zone), which is what lets the meal plan detail
-- page render the week view (one column per day, DS #660). The column
-- is nullable and has no backfill: entries written before this change
-- — and entries a client still sends without a day — keep `day = null`
-- and the host groups them under the fallback (plan order from the
-- plan's starts_on; see groupMealPlanEntriesByDay in @eciperay/client).
-- Both entry kinds carry it: meal entries and recipe entries alike.

alter table meal_plan_entries
  add column if not exists day date;
