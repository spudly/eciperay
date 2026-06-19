-- Recipe versioning: lineage container + versions + cook logs

create table if not exists recipe_versions (
  id                      uuid primary key default gen_random_uuid(),
  recipe_id               uuid not null references recipes(id) on delete cascade,
  version_number          integer not null,
  title                   text not null,
  description             text,
  servings                integer not null default 4,
  prep_time_min           integer,
  cook_time_min           integer,
  image_url               text,
  source_url              text,
  created_via             text not null default 'manual'
                            check (created_via in (
                              'ai', 'manual', 'import_url', 'import_image',
                              'import_text', 'import_bulk', 'tweak_ai', 'tweak_manual'
                            )),
  change_summary          text,
  derived_from_version_id uuid references recipe_versions(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (recipe_id, version_number)
);

create index if not exists recipe_versions_recipe_id_idx on recipe_versions(recipe_id);

create table if not exists cook_logs (
  id                  uuid primary key default gen_random_uuid(),
  recipe_version_id   uuid not null references recipe_versions(id) on delete cascade,
  user_id             uuid not null references users(id) on delete cascade,
  cooked_at           timestamptz not null default now(),
  author_star_rating  smallint check (author_star_rating between 1 and 5),
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists cook_logs_recipe_version_id_idx on cook_logs(recipe_version_id);

alter table recipes
  add column if not exists status text not null default 'idea'
    check (status in ('idea', 'evolving', 'perfected', 'abandoned')),
  add column if not exists active_version_id uuid references recipe_versions(id) on delete set null;

-- Backfill version 1 from existing recipes
insert into recipe_versions (
  recipe_id, version_number, title, description, servings,
  prep_time_min, cook_time_min, image_url, source_url, created_via
)
select
  r.id, 1, r.title, r.description, r.servings,
  r.prep_time_min, r.cook_time_min, r.image_url, r.source_url, 'manual'
from recipes r
where not exists (
  select 1 from recipe_versions rv where rv.recipe_id = r.id and rv.version_number = 1
);

update recipes r
set active_version_id = rv.id
from recipe_versions rv
where rv.recipe_id = r.id
  and rv.version_number = 1
  and r.active_version_id is null;

-- Repoint ingredients to versions
alter table ingredients add column if not exists recipe_version_id uuid references recipe_versions(id) on delete cascade;

update ingredients i
set recipe_version_id = rv.id
from recipe_versions rv
where rv.recipe_id = i.recipe_id
  and rv.version_number = 1
  and i.recipe_version_id is null;

alter table ingredients drop constraint if exists ingredients_recipe_id_fkey;
alter table ingredients drop column if exists recipe_id;
alter table ingredients alter column recipe_version_id set not null;
create index if not exists ingredients_recipe_version_id_idx on ingredients(recipe_version_id);

-- Repoint instructions to versions
alter table instructions add column if not exists recipe_version_id uuid references recipe_versions(id) on delete cascade;

update instructions ins
set recipe_version_id = rv.id
from recipe_versions rv
where rv.recipe_id = ins.recipe_id
  and rv.version_number = 1
  and ins.recipe_version_id is null;

alter table instructions drop constraint if exists instructions_recipe_id_fkey;
alter table instructions drop column if exists recipe_id;
alter table instructions alter column recipe_version_id set not null;
create index if not exists instructions_recipe_version_id_idx on instructions(recipe_version_id);

-- Repoint recipe_tags to versions
alter table recipe_tags add column if not exists recipe_version_id uuid references recipe_versions(id) on delete cascade;

update recipe_tags rt
set recipe_version_id = rv.id
from recipe_versions rv
where rv.recipe_id = rt.recipe_id
  and rv.version_number = 1
  and rt.recipe_version_id is null;

alter table recipe_tags drop constraint if exists recipe_tags_pkey;
alter table recipe_tags drop constraint if exists recipe_tags_recipe_id_fkey;
alter table recipe_tags drop column if exists recipe_id;
alter table recipe_tags alter column recipe_version_id set not null;
alter table recipe_tags add primary key (recipe_version_id, tag_id);

-- Migrate recipe_notes to cook_logs
insert into cook_logs (recipe_version_id, user_id, cooked_at, notes, created_at)
select rv.id, rn.user_id, rn.created_at, rn.content, rn.created_at
from recipe_notes rn
join recipe_versions rv on rv.recipe_id = rn.recipe_id and rv.version_number = 1;

-- Migrate pending drafts to version 2 (content from snapshot_json)
insert into recipe_versions (
  recipe_id, version_number, title, description, servings,
  prep_time_min, cook_time_min, image_url, source_url,
  created_via, change_summary, derived_from_version_id
)
select
  d.recipe_id,
  2,
  coalesce(d.diff_json->>'title', d.snapshot_json->>'title'),
  coalesce(d.diff_json->>'description', d.snapshot_json->>'description'),
  coalesce((d.diff_json->>'servings')::integer, (d.snapshot_json->>'servings')::integer, 4),
  coalesce((d.diff_json->>'prepTimeMin')::integer, (d.snapshot_json->>'prepTimeMin')::integer),
  coalesce((d.diff_json->>'cookTimeMin')::integer, (d.snapshot_json->>'cookTimeMin')::integer),
  coalesce(d.diff_json->>'imageUrl', d.snapshot_json->>'imageUrl'),
  coalesce(d.diff_json->>'sourceUrl', d.snapshot_json->>'sourceUrl'),
  case d.trigger when 'ai_chat' then 'tweak_ai' else 'tweak_manual' end,
  d.summary_of_changes,
  r.active_version_id
from recipe_drafts d
join recipes r on r.id = d.recipe_id
where d.status = 'pending'
  and not exists (
    select 1 from recipe_versions rv where rv.recipe_id = d.recipe_id and rv.version_number = 2
  );

update recipes r
set status = 'evolving'
where exists (
  select 1 from recipe_drafts d where d.recipe_id = r.id and d.status = 'pending'
);

-- Copy ingredients/instructions for draft-migrated version 2 from snapshot (or diff override)
insert into ingredients (
  recipe_version_id, sort_order, name, quantity, unit, notes, is_optional
)
select
  rv2.id,
  coalesce((elem->>'sortOrder')::integer, ordinality - 1),
  elem->>'name',
  nullif(elem->>'quantity', '')::numeric,
  elem->>'unit',
  elem->>'notes',
  coalesce((elem->>'isOptional')::boolean, false)
from recipe_drafts d
join recipe_versions rv2 on rv2.recipe_id = d.recipe_id and rv2.version_number = 2
cross join lateral jsonb_array_elements(
  coalesce(
    nullif(d.diff_json->'ingredients', 'null'::jsonb),
    d.snapshot_json->'ingredients',
    '[]'::jsonb
  )
) with ordinality as t(elem, ordinality)
where d.status = 'pending';

insert into instructions (recipe_version_id, step_number, body)
select
  rv2.id,
  coalesce((elem->>'stepNumber')::integer, ordinality),
  elem->>'body'
from recipe_drafts d
join recipe_versions rv2 on rv2.recipe_id = d.recipe_id and rv2.version_number = 2
cross join lateral jsonb_array_elements(
  coalesce(
    nullif(d.diff_json->'instructions', 'null'::jsonb),
    d.snapshot_json->'instructions',
    '[]'::jsonb
  )
) with ordinality as t(elem, ordinality)
where d.status = 'pending';

-- Drop legacy tables
drop table if exists recipe_drafts;
drop table if exists recipe_notes;
drop table if exists ai_conversations;

-- Drop content columns from recipes (lineage only)
alter table recipes
  drop column if exists title,
  drop column if exists description,
  drop column if exists servings,
  drop column if exists prep_time_min,
  drop column if exists cook_time_min,
  drop column if exists image_url,
  drop column if exists star_rating,
  drop column if exists source_url;

create trigger recipe_versions_updated_at
  before update on recipe_versions
  for each row execute procedure set_updated_at();
