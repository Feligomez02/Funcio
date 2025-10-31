-- Documents uploaded for OCR processing
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  storage_path text not null,
  pages integer,
  source_hash text,
  language text,
  status text not null default 'queued',
  uploaded_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists documents_project_status_idx on public.documents (project_id, status);

-- Individual pages tied to a document
create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null,
  status text not null default 'queued',
  text text,
  ocr_confidence numeric,
  error text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create unique index if not exists document_pages_document_page_number_idx
  on public.document_pages (document_id, page_number);

-- OCR/LMM extracted requirement candidates
create table if not exists public.requirement_candidates (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_id uuid references public.document_pages(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  text text not null,
  type text,
  confidence numeric,
  rationale text,
  status text not null default 'draft',
  dedupe_group_id uuid,
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users(id)
);

create index if not exists requirement_candidates_document_idx on public.requirement_candidates (document_id, status);
create index if not exists requirement_candidates_project_idx on public.requirement_candidates (project_id, status);

-- Link approved requirements back to their source
create table if not exists public.requirement_sources (
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_id uuid references public.document_pages(id) on delete set null,
  offset_start integer,
  offset_end integer,
  created_at timestamp with time zone default now(),
  primary key (requirement_id, document_id, page_id)
);
