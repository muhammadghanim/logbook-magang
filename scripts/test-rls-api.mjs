import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = process.env
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'RLS_TEST_EMAIL_A', 'RLS_TEST_PASSWORD_A', 'RLS_TEST_EMAIL_B', 'RLS_TEST_PASSWORD_B']
for (const key of required) {
  if (!env[key]?.trim()) throw new Error(`Isi ${key} di konfigurasi lokal sebelum menjalankan uji API.`)
}
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
if (!key.startsWith('sb_publishable_')) {
  let role
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role } catch { /* ditolak di bawah */ }
  assert.equal(role, 'anon', 'Uji wajib menggunakan publishable/anon key, bukan service_role atau secret key.')
}
assert.notEqual(env.RLS_TEST_EMAIL_A.trim().toLowerCase(), env.RLS_TEST_EMAIL_B.trim().toLowerCase(), 'Gunakan dua akun yang berbeda.')

function client() {
  return createClient(env.VITE_SUPABASE_URL.trim(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }) },
  })
}
function success(response, step) {
  assert.equal(response.error, null, `${step} gagal (${response.error?.code || 'unknown'}). Pastikan migrasi sudah diterapkan.`)
  return response.data
}
function denied(response, step) {
  assert.equal(response.error?.code, '42501', `${step}: harus ditolak database dengan kode 42501.`)
}
const a = client()
const b = client()
const anon = client()
const idA = randomUUID()
const idB = randomUUID()
const idExtra = randomUUID()
const spoofA = randomUUID()
const spoofB = randomUUID()
const date = '2026-11-17'
const ids = [idA, idB, idExtra, spoofA, spoofB]
const rows = db => db.from('entries')
const entry = id => ({ id, activity_date: date, activity: 'UJI RLS — data sintetis', result: 'Uji akses pribadi', evidence_url: null })
let userA, userB

try {
  const authA = success(await a.auth.signInWithPassword({ email: env.RLS_TEST_EMAIL_A.trim(), password: env.RLS_TEST_PASSWORD_A }), 'Login A')
  userA = authA.user
  const authB = success(await b.auth.signInWithPassword({ email: env.RLS_TEST_EMAIL_B.trim(), password: env.RLS_TEST_PASSWORD_B }), 'Login B')
  userB = authB.user
  assert.notEqual(userA.id, userB.id)

  const savedA = success(await rows(a).insert(entry(idA)).select().single(), 'Insert A')
  const savedB = success(await rows(b).insert(entry(idB)).select().single(), 'Insert B')
  assert.equal(savedA.owner_id, userA.id)
  assert.equal(savedB.owner_id, userB.id)
  const extra = success(await rows(a).insert({ ...entry(idExtra), evidence_url: '' }).select().single(), 'Tanggal sama dan bukti kosong')
  assert.equal(extra.activity_date, savedA.activity_date)
  assert.equal(savedA.evidence_url, null)
  console.log('PASS: akun A/B dapat membuat entri sendiri; tanggal sama dan bukti kosong diterima.')

  for (const [db, ownId, foreignId, ownUser, foreignUser, spoofId, label] of [
    [a, idA, idB, userA, userB, spoofA, 'A'],
    [b, idB, idA, userB, userA, spoofB, 'B'],
  ]) {
    // Baca koleksi dan baca langsung ID: pengujian melewati API, bukan filter UI.
    const collection = success(await rows(db).select('id, owner_id').in('id', ids), `Baca koleksi ${label}`)
    assert(collection.some(row => row.id === ownId))
    assert(collection.every(row => row.owner_id === ownUser.id))
    assert.deepEqual(success(await rows(db).select('*').eq('id', foreignId), `Baca lintas akun ${label}`), [])
    assert.deepEqual(success(await rows(db).update({ result: 'Percobaan lintas akun' }).eq('id', foreignId).select('id'), `Update lintas akun ${label}`), [])
    assert.deepEqual(success(await rows(db).delete().eq('id', foreignId).select('id'), `Delete lintas akun ${label}`), [])
    denied(await rows(db).insert({ ...entry(spoofId), owner_id: foreignUser.id }), `Insert atas nama orang lain ${label}`)
    denied(await rows(db).upsert({ ...entry(foreignId), owner_id: ownUser.id }), `Upsert lintas akun ${label}`)
    denied(await rows(db).update({ owner_id: foreignUser.id }).eq('id', ownId), `Pindah pemilik ${label}`)
    const current = success(await rows(db).select('owner_id, result').eq('id', ownId).single(), `Data tetap utuh ${label}`)
    assert.equal(current.owner_id, ownUser.id)
    assert.equal(current.result, 'Uji akses pribadi')
  }
  console.log('PASS: A dan B tidak dapat membaca, mengubah, menghapus, membuat, atau memindahkan entri atas nama akun lain.')

  for (const request of [
    () => rows(anon).select('*').in('id', ids),
    () => rows(anon).insert(entry(randomUUID())),
    () => rows(anon).update({ result: 'Anonim' }).eq('id', idA),
    () => rows(anon).delete().eq('id', idB),
  ]) denied(await request(), 'Akses anonim')
  console.log('PASS: pengguna anonim ditolak untuk baca, tambah, ubah, dan hapus.')

  const updated = success(await rows(a).update({ result: 'Hasil uji diperbarui', evidence_url: 'https://example.com/bukti' }).eq('id', idA).select().single(), 'Update milik sendiri')
  assert.equal(updated.result, 'Hasil uji diperbarui')
  assert.equal(updated.evidence_url, 'https://example.com/bukti')
  const deleted = success(await rows(a).delete().eq('id', idExtra).select('id'), 'Delete milik sendiri')
  assert.deepEqual(deleted, [{ id: idExtra }])
  console.log('PASS: pemilik dapat mengubah dan menghapus entri sendiri.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  // Hanya UUID yang dialokasikan skrip ini; tidak menghapus entri pengguna lain.
  for (const [db, user] of [[a, userA], [b, userB]]) {
    if (!user) continue
    try {
      const cleanup = await rows(db).delete().in('id', ids).select('id')
      if (cleanup.error) throw new Error('Pembersihan ditolak')
    } catch {
      console.error(`Pembersihan data sintetis belum berhasil. Periksa entri dengan UUID: ${ids.join(', ')}`)
      process.exitCode = 1
    }
    try { await db.auth.signOut({ scope: 'local' }) } catch { /* sesi tidak disimpan di disk */ }
  }
}
