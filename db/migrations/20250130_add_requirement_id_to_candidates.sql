alter table public.requirement_candidates
  add column if not exists requirement_id uuid references public.requirements(id) on delete set null;

create index if not exists requirement_candidates_requirement_id_idx
  on public.requirement_candidates (requirement_id);
