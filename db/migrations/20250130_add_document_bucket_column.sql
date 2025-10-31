alter table public.documents
  add column if not exists storage_bucket text default 'documents';

update public.documents
  set storage_bucket = coalesce(storage_bucket, 'documents');
