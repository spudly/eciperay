-- Personal access tokens for API and MCP clients

create table if not exists personal_access_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  token_prefix text not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists personal_access_tokens_user_id_idx
  on personal_access_tokens (user_id);
