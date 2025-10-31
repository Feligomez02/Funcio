alter table public.documents
  add column if not exists hidden_at timestamptz;
