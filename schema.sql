create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now(),
  integrations jsonb default '{}'::jsonb
);

alter table projects add column if not exists integrations jsonb default '{}'::jsonb;

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text not null,
  created_at timestamptz default now()
);

create unique index if not exists project_members_unique_member
  on project_members(project_id, user_id);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text not null,
  type text,
  priority int default 3,
  status text default 'analysis',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  ai_user_story text,
  ai_acceptance_criteria jsonb,
  ai_issues jsonb,
  ai_confidence numeric,
  ai_provider text,
  ai_language text,
  ai_tokens_used int
);

alter table requirements add column if not exists ai_user_story text;
alter table requirements add column if not exists ai_acceptance_criteria jsonb;
alter table requirements add column if not exists ai_issues jsonb;
alter table requirements add column if not exists ai_confidence numeric;
alter table requirements add column if not exists ai_provider text;
alter table requirements add column if not exists ai_language text;
alter table requirements add column if not exists ai_tokens_used int;

alter table requirements add column if not exists ai_type_suggestion text;
alter table requirements add column if not exists ai_type_confidence numeric;
alter table requirements add column if not exists ai_type_reason text;

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz default now(),
  payload jsonb
);

create table if not exists requirement_history (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid references requirements(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  changed_fields jsonb,
  change_note text,
  created_at timestamptz default now()
);

create index if not exists requirement_history_requirement_idx
  on requirement_history(requirement_id, created_at desc);

create table if not exists requirement_links (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  provider text not null,
  external_type text not null,
  external_id text not null,
  external_key text,
  summary text,
  status text,
  url text,
  metadata jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create unique index if not exists requirement_links_unique_external
  on requirement_links(requirement_id, provider, external_type, external_id);
