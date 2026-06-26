-- Unify lifecycle status and development status into a single 'status' column.
-- The 'status' column (from migration 004) is the survivor.
-- Map development_status values into status where they diverge, then drop.

-- Recipes that had development_status = 'in_development' but status = 'idea'
-- should be promoted to 'evolving' (the equivalent lifecycle state).
update recipes
set status = 'evolving'
where status = 'idea'
  and development_status = 'in_development';

-- Recipes that had development_status = 'perfected' but status was still 'idea'
-- or 'evolving' should be promoted to 'perfected'.
update recipes
set status = 'perfected'
where status in ('idea', 'evolving')
  and development_status = 'perfected';

-- Drop the redundant column.
alter table recipes drop column if exists development_status;
