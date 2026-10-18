-- Seed the Paddle price -> plan mapping for the SANDBOX catalog
-- (products created 2026-10-16). Migration 016 created plan_prices
-- empty and left the inserts as a manual step; seed data belongs in a
-- migration so it is reviewed and applied by the deploy like everything
-- else. These are sandbox price IDs — at production cutover a follow-up
-- migration replaces them with the live catalog's IDs.
insert into plan_prices (paddle_price_id, plan) values
  ('pri_01m53jw8cr6vs2m8w15j73e0t9', 'plus'),
  ('pri_01m53jwwqhv5dmq6b9b5kh4a56', 'plus'),
  ('pri_01m53jthnpvts3hvnk5mq6k8hc', 'power'),
  ('pri_01m53jvert9dt3gft37p62b6p4', 'power')
on conflict (paddle_price_id) do update set plan = excluded.plan;
