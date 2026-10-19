-- Entitlement overrides: secret comp grants (Phase 1 follow-up).
--
-- A row here wins over any Paddle-backed subscriptions row in
-- resolveEntitlement: the granted plan never expires, is never lazily
-- downgraded, and is exempt from AI metering (Entitlement.unlimited).
--
-- Granted and revoked ONLY via direct database access (e.g. the Supabase
-- SQL editor). There is deliberately no API endpoint and no UI for this
-- table — that absence is what keeps the grants secret.
--
-- Grant:  insert into entitlement_overrides (user_id, plan, note)
--           select id, 'power', 'owner comp' from users where email = '<email>';
-- Revoke: delete from entitlement_overrides where user_id = '<user id>';

create table if not exists entitlement_overrides (
  user_id    uuid primary key references users(id) on delete cascade,
  plan       text not null check (plan in ('plus', 'power')),
  note       text,
  created_at timestamptz not null default now()
);

-- The absence of an API is not access control: Supabase exposes
-- public-schema tables through its Data API with default grants, so lock
-- this table down explicitly. RLS is enabled with no client policies and
-- client-role privileges are revoked — only privileged database access
-- (the SQL editor, the server's own connection) can read or write grants.
alter table entitlement_overrides enable row level security;
revoke all on entitlement_overrides from anon, authenticated, public;
