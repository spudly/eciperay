-- Author display on public recipes (#411): owners control whether their
-- display name is shown as the author of their published recipes.
-- Default true preserves the existing behavior (Discover already showed
-- the author's display name publicly).
alter table users
  add column if not exists show_author_on_public_recipes boolean not null
    default true;
