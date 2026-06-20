-- AI create sessions for plan -> approve -> preview -> create recipe flow
create table if not exists ai_create_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  phase               text not null check (
    phase in ('planning', 'plan_approved', 'preview_ready', 'completed', 'cancelled')
  ),
  messages            jsonb not null default '[]',
  approved_plan       text,
  proposed_recipe     jsonb,
  change_summary      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ai_create_sessions_user_idx
  on ai_create_sessions(user_id);
