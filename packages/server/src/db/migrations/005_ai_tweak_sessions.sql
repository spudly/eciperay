-- AI tweak sessions for conversational plan -> approve -> implement flow
create table if not exists ai_tweak_sessions (
  id                  uuid primary key default gen_random_uuid(),
  recipe_id           uuid not null references recipes(id) on delete cascade,
  user_id             uuid not null references users(id) on delete cascade,
  phase               text not null check (
    phase in ('planning', 'plan_approved', 'preview_ready', 'completed', 'cancelled')
  ),
  messages            jsonb not null default '[]',
  approved_plan       text,
  proposed_recipe     jsonb,
  parent_version_id   uuid not null references recipe_versions(id) on delete cascade,
  change_summary      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ai_tweak_sessions_recipe_user_idx
  on ai_tweak_sessions(recipe_id, user_id);
