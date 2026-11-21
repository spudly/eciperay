-- Admin flag (#621): tag management is admin-only. Option B as approved
-- by Stephen (2026-11-20): a users.is_admin boolean defines admin, NOT an
-- env allowlist. Existing users default to non-admin; flag an account
-- with a manual update, e.g.
--   update users set is_admin = true where email = '<admin email>';

alter table users
  add column if not exists is_admin boolean not null default false;
