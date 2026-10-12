-- Billing entitlements (Phase 1 of monetization).
--
-- Numbered 016 (not 015): PR #101's unmerged feat/mcp-server branch already
-- claimed 015 for its personal-access-tokens table. Whoever merges second
-- renumbers.
--
-- Design notes vs the spec draft:
-- - subscriptions.past_due_since added (spec §4c requires recording it, but the
--   draft SQL omitted the column). Used for the 7-day past_due grace window.

-- One row per paying user. No row = Free plan.
create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade unique,
  plan                 text not null check (plan in ('plus','power')),
  status               text not null default 'active'
                         check (status in ('active','past_due','cancelled','expired')),
  paddle_customer_id   text,
  paddle_subscription_id text unique,
  paddle_price_id      text,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  past_due_since       timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists subscriptions_paddle_customer_idx
  on subscriptions(paddle_customer_id);

-- Paddle price_id -> plan mapping (kept in DB so new prices don't need a deploy).
-- Stephen inserts the four rows (plus monthly/annual, power monthly/annual)
-- after creating the products in the Paddle dashboard.
create table if not exists plan_prices (
  paddle_price_id text primary key,
  plan            text not null check (plan in ('plus','power'))
);

-- Monthly AI usage, calendar-month UTC windows. One row per (user, month).
create table if not exists ai_usage (
  user_id      uuid not null references users(id) on delete cascade,
  period_start date not null,
  calls        integer not null default 0,
  primary key (user_id, period_start)
);

-- Webhook idempotency log
create table if not exists paddle_events (
  event_id   text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure set_updated_at();
