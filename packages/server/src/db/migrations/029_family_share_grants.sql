-- Family sharing (#617): a standing owner -> recipient grant covering the
-- owner's whole recipe library (existing and future recipes, private
-- included), checked alongside per-recipe recipe_share_grants in the
-- central read-access layer. Revocation is a plain row delete: access ends
-- immediately, while any per-recipe grants the recipient holds survive.

create table if not exists family_share_grants (
  owner_user_id     uuid not null references users(id) on delete cascade,
  recipient_user_id uuid not null references users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (owner_user_id, recipient_user_id),
  check (owner_user_id <> recipient_user_id)
);

create index if not exists family_share_grants_recipient_idx
  on family_share_grants(recipient_user_id, created_at desc);
