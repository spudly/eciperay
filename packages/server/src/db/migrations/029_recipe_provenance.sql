-- Recipe-level provenance (#609): where a recipe came from, recorded at
-- creation. Nullable only for legacy rows the backfill cannot classify;
-- new recipes always persist a provenance (enforced in the save path).

alter table recipes
  add column if not exists provenance_source text
    check (provenance_source in (
      'original', 'ai_generated', 'import_url', 'import_cookbook_photo',
      'import_text', 'import_bulk', 'shared_clone', 'other'
    )),
  add column if not exists provenance_detail text;

create index if not exists recipes_provenance_source_idx
  on recipes(provenance_source);

-- Backfill from each recipe's first version (lowest version_number):
-- recipe_versions.created_via / source_url are the only provenance signal
-- legacy rows carry.
update recipes r
set provenance_source = case first_v.created_via
      when 'manual' then 'original'
      when 'ai' then 'ai_generated'
      when 'tweak_manual' then 'original'
      when 'tweak_ai' then 'ai_generated'
      when 'import_url' then 'import_url'
      when 'import_image' then 'import_cookbook_photo'
      when 'import_text' then 'import_text'
      when 'import_bulk' then 'import_bulk'
      else 'other'
    end,
    provenance_detail = case
      when first_v.created_via = 'import_url' then first_v.source_url
      else null
    end
from (
  select distinct on (recipe_id) recipe_id, created_via, source_url
  from recipe_versions
  order by recipe_id, version_number asc
) first_v
where first_v.recipe_id = r.id
  and r.provenance_source is null;

-- Clones carry their own provenance regardless of the first version's
-- created_via.
update recipes
set provenance_source = 'shared_clone'
where cloned_from_recipe_id is not null;
