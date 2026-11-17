-- Hanya untuk database uji, setelah bootstrap.sql dan migrasi.
-- SET ROLE menjalankan query sebagai role non-superuser yang terkena RLS.
begin;
insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.entries (id, activity_date, activity, result) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-17', 'Kegiatan A', 'Hasil A');
insert into public.entries (activity_date, activity, result, evidence_url) values
  ('2026-11-17', 'Kegiatan A kedua', 'Hasil kedua', ''),
  ('2026-11-17', 'Kegiatan A ketiga', 'Hasil ketiga', 'https://example.com/bukti');

do $$ begin
  if (select count(*) from public.entries) <> 3 then raise exception 'A gagal membaca entri sendiri'; end if;
  if exists (select 1 from public.entries where owner_id <> auth.uid()) then raise exception 'Default pemilik salah'; end if;
  begin
    insert into public.entries (owner_id, activity_date, activity, result)
    values ('22222222-2222-4222-8222-222222222222', '2026-11-17', 'Palsu', 'Palsu');
    raise exception 'A berhasil membuat entri atas nama B';
  exception when insufficient_privilege then null; end;
  begin
    update public.entries set owner_id = '22222222-2222-4222-8222-222222222222';
    raise exception 'A berhasil memindahkan pemilik ke B';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.entries (activity_date, activity, result) values ('2026-11-17', E' \t\n', 'Hasil');
    raise exception 'Kegiatan kosong diterima';
  exception when check_violation then null; end;
  begin
    insert into public.entries (activity_date, activity, result) values ('2026-11-17', 'Kegiatan', '');
    raise exception 'Hasil kosong diterima';
  exception when check_violation then null; end;
  begin
    insert into public.entries (activity_date, activity, result, evidence_url)
    values ('2026-11-17', 'Kegiatan', 'Hasil', 'javascript:alert(1)');
    raise exception 'Protokol non-web diterima';
  exception when check_violation then null; end;
  begin
    insert into public.entries (activity_date, activity, result) values (null, 'Kegiatan', 'Hasil');
    raise exception 'Tanggal kosong diterima';
  exception when not_null_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ declare affected integer; begin
  if exists (select 1 from public.entries) then raise exception 'B dapat membaca data A'; end if;
  begin
    insert into public.entries (owner_id, activity_date, activity, result)
    values ('11111111-1111-4111-8111-111111111111', '2026-11-17', 'Palsu B', 'Palsu B');
    raise exception 'B berhasil membuat entri atas nama A';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.entries (id, activity_date, activity, result)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-17', 'Upsert palsu', 'Upsert palsu')
    on conflict (id) do update set result = excluded.result;
    raise exception 'B dapat upsert data A';
  exception when insufficient_privilege then null; end;
  update public.entries set result = 'Disusupi' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'B dapat mengubah data A'; end if;
  delete from public.entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'B dapat menghapus data A'; end if;
end $$;
insert into public.entries (id, activity_date, activity, result) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-11-17', 'Kegiatan B', 'Hasil B');
update public.entries set result = 'Hasil B diperbarui' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
  if (select result from public.entries where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'Hasil B diperbarui'
  then raise exception 'Pemilik gagal mengubah entri sendiri'; end if;
end $$;
delete from public.entries where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
  if exists (select 1 from public.entries) then raise exception 'Pemilik gagal menghapus entri sendiri'; end if;
end $$;
insert into public.entries (id, activity_date, activity, result) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-11-17', 'Kegiatan B', 'Hasil B');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ declare affected integer; begin
  if (select count(*) from public.entries) <> 3 then raise exception 'A dapat membaca data B'; end if;
  update public.entries set result = 'Disusupi' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A dapat mengubah data B'; end if;
  delete from public.entries where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A dapat menghapus data B'; end if;
  if (select result from public.entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'Hasil A'
  then raise exception 'Data A berubah setelah serangan B'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  if exists (select 1 from public.entries) then raise exception 'Role tanpa identitas dapat membaca'; end if;
  begin
    insert into public.entries (owner_id, activity_date, activity, result)
    values ('11111111-1111-4111-8111-111111111111', '2026-11-17', 'Tanpa identitas', 'Tanpa identitas');
    raise exception 'Role tanpa identitas dapat menambah';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin perform * from public.entries; raise exception 'Anonim dapat membaca';
  exception when insufficient_privilege then null; end;
  begin insert into public.entries (activity_date, activity, result) values ('2026-11-17', 'Anon', 'Anon');
    raise exception 'Anonim dapat menambah'; exception when insufficient_privilege then null; end;
  begin update public.entries set result = 'Anon'; raise exception 'Anonim dapat mengubah';
  exception when insufficient_privilege then null; end;
  begin delete from public.entries; raise exception 'Anonim dapat menghapus';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: pemilik, isolasi dua akun, anonim, dan constraint database' as result;
