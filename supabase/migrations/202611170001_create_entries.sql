-- Tahap 2: jalankan sebagai pemilik database melalui Supabase SQL Editor
-- atau Supabase CLI. Seluruh perubahan diterapkan dalam satu transaksi.
begin;

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_date date not null,
  activity text not null constraint entries_activity_required
    check (activity ~ '[^[:space:]]'),
  result text not null constraint entries_result_required
    check (result ~ '[^[:space:]]'),
  evidence_url text constraint entries_evidence_web_url
    check (
      evidence_url is null or evidence_url = '' or
      evidence_url ~* '^https?://[^[:space:]/?#]+[^[:space:]]*$'
    ),
  created_at timestamptz not null default now()
);

comment on table public.entries is 'Entri kegiatan magang pribadi; akses dibatasi oleh RLS.';
comment on column public.entries.activity_date is 'Tanggal kegiatan, bukan waktu penyimpanan. Beberapa entri boleh memiliki tanggal yang sama.';
comment on column public.entries.evidence_url is 'Satu tautan opsional. Database memeriksa protokol HTTP/HTTPS dan ketiadaan spasi; validasi URL lengkap dilakukan pada formulir tahap 3.';

create index entries_owner_date_idx
  on public.entries (owner_id, activity_date desc, created_at desc);

alter table public.entries enable row level security;
alter table public.entries force row level security;

-- Jangan mewarisi hak akses default untuk pengguna anonim.
revoke all on table public.entries from public, anon, authenticated;
grant select, insert, update, delete on table public.entries to authenticated;

create policy entries_select_own on public.entries
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy entries_insert_own on public.entries
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy entries_update_own on public.entries
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy entries_delete_own on public.entries
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

commit;
