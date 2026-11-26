-- Per-step ingredient links for cook mode (#643, tranche 1): each
-- instruction records the ordered IDs of the ingredients (same recipe
-- version) it uses, Mealie-style references over the flat ingredient
-- list — the list itself stays canonical for scaling, shopping lists,
-- and nutrition. JSONB array on the instruction row (no join table:
-- references are version-scoped, ordered, and always read/written with
-- the instruction). Existing rows default to an empty array, which cook
-- mode treats as "no links yet" and falls back to the full list.

alter table instructions
  add column if not exists ingredient_references jsonb not null default '[]'::jsonb;
