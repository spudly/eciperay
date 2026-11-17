-- Issued share-link tokens for a recipe (#534): every share-link mint adds a
-- hash here instead of replacing the previous one, so links already sent keep
-- working until the owner explicitly rotates (which clears this table) or
-- returns the recipe to private/public (which also clears it). The legacy
-- recipes.share_token_hash column keeps the most recently minted hash and
-- stays part of verification for rows minted before this migration.

create table if not exists recipe_share_tokens (
  recipe_id   uuid not null references recipes(id) on delete cascade,
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  primary key (recipe_id, token_hash)
);

insert into recipe_share_tokens (recipe_id, token_hash)
select id, share_token_hash from recipes where share_token_hash is not null
on conflict do nothing;
