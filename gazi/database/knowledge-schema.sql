create table if not exists public.gazi_knowledge_releases (
 revision text primary key,
 payload jsonb not null check (jsonb_typeof(payload)='object'),
 content_sha256 text not null check (length(content_sha256)=64),
 published_at timestamptz not null default now(),
 check (payload->>'version'=revision)
);
alter table public.gazi_knowledge_releases enable row level security;
revoke all on public.gazi_knowledge_releases from public, anon, authenticated;
grant select on public.gazi_knowledge_releases to anon, authenticated;
create policy "Read reviewed public knowledge releases" on public.gazi_knowledge_releases for select to anon, authenticated using (true);
comment on table public.gazi_knowledge_releases is 'Versioned public official-source summaries and original guidance. No student, user, decision or private institutional records.';
