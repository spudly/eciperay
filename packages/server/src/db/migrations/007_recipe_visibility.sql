-- Recipe visibility and sharing foundation

alter table recipes
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  add column if not exists slug text not null default 'recipe',
  add column if not exists share_token_hash text,
  add column if not exists content_revision integer not null default 1,
  add column if not exists development_status text not null default 'idea'
    check (development_status in ('idea', 'in_development', 'perfected')),
  add column if not exists cloned_from_recipe_id uuid references recipes(id) on delete set null;

create index if not exists recipes_visibility_idx on recipes(visibility);
create index if not exists recipes_slug_idx on recipes(slug);

-- Backfill slugs from active version titles
update recipes r
set slug = coalesce(
  nullif(
    lower(
      regexp_replace(
        regexp_replace(trim(rv.title), '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+',
        '-',
        'g'
      )
    ),
    ''
  ),
  'recipe'
)
from recipe_versions rv
where rv.id = r.active_version_id
  and r.slug = 'recipe';
