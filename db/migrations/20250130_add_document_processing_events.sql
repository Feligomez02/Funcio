create table if not exists public.document_processing_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  batch_started_at timestamp with time zone not null default now(),
  batch_completed_at timestamp with time zone,
  pages_processed integer not null,
  candidates_inserted integer not null,
  status text not null,
  error text,
  metadata jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists document_processing_events_document_idx
  on public.document_processing_events (document_id, created_at desc);

alter table public.documents
  add column if not exists last_processed_at timestamp with time zone,
  add column if not exists last_ocr_error text,
  add column if not exists batches_processed integer default 0,
  add column if not exists candidates_imported integer default 0;
