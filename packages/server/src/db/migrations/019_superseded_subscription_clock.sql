-- Superseded-subscription clock for billing reconciliation.
--
-- A subscriptions row tracks ONE current subscription, but ordering
-- protection needs two clocks: paddle_last_event_at is the current
-- subscription's revision clock, while these columns remember the
-- subscription the row most recently replaced and the last event
-- timestamp applied for it. Events for the superseded subscription
-- order against its own clock — comparing them against the current
-- subscription's timestamp both let delayed old-subscription events
-- overwrite a replacement and let the old subscription's later
-- events suppress the replacement's genuine earlier ones (e.g. its
-- cancellation).

alter table subscriptions
  add column if not exists superseded_subscription_id text,
  add column if not exists superseded_last_event_at timestamptz;

-- The status-event lookup matches a subscription in either slot
-- (paddle_subscription_id = $1 OR superseded_subscription_id = $1).
-- Only the current id is covered by migration 016's unique
-- constraint; without this index the OR branch scans the table.
create index if not exists subscriptions_superseded_subscription_id_idx
  on subscriptions (superseded_subscription_id);
