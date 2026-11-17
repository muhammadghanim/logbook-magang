import { useEffect, useState } from 'react'
import { configError, supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let active = true
    let authChanged = false
    setLoading(true)
    setError('')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      authChanged = true
      setSession(nextSession)
      setPassword('')
      setError('')
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authChanged) return
      if (sessionError) setError('Sesi belum dapat diperiksa. Periksa koneksi, lalu coba lagi.')
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      if (!active || authChanged) return
      setError('Sesi belum dapat diperiksa. Periksa koneksi, lalu coba lagi.')
      setLoading(false)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [retry])

  async function signIn(event) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) {
        setError(authError.code === 'invalid_credentials'
          ? 'Email atau kata sandi salah.'
          : authError.code === 'email_not_confirmed'
            ? 'Konfirmasikan email Anda sebelum masuk.'
            : 'Tidak dapat masuk. Periksa koneksi dan akun Anda, lalu coba lagi.')
      } else {
        setSession(data.session)
        setPassword('')
      }
    } catch {
      setError('Tidak dapat terhubung. Periksa koneksi Anda, lalu coba lagi.')
    } finally { setBusy(false) }
  }

  async function signOut() {
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signOut({ scope: 'local' })
      if (authError) setError('Belum berhasil keluar. Periksa koneksi, lalu coba lagi.')
      else { setSession(null); setEmail(''); setPassword('') }
    } catch {
      setError('Belum berhasil keluar. Periksa koneksi, lalu coba lagi.')
    } finally { setBusy(false) }
  }

  return (
    <main className="shell">
      <header className="brand"><span className="brand-mark" aria-hidden="true">L</span> Logbook Magang</header>
      <div className="layout">
        <section className="intro">
          <p className="eyebrow">CATATAN KECIL, PERJALANAN BERARTI</p>
          <h1>Setiap hari magang,<br />ada yang bisa diceritakan.</h1>
          <p>Satu tempat untuk mencatat kegiatan, menyimpan tautan bukti, dan melihat kembali proses belajarmu.</p>
          <div className="note"><span aria-hidden="true">↗</span><p>Mulai dari langkah pertama.<br /><strong>Masuk dengan akun pribadimu.</strong></p></div>
        </section>
        <section className="card" aria-labelledby="card-title" aria-busy={loading || busy}>
          {configError ? <>
            <p className="eyebrow">PERSIAPAN LOKAL</p>
            <h2 id="card-title">Hubungkan Supabase</h2>
            <p role="status">{configError}</p>
            <p className="hint">Petunjuk lengkap tersedia di README.md. Login akan tersedia setelah konfigurasi terisi.</p>
          </> : loading ? <>
            <h2 id="card-title">Memeriksa sesi…</h2>
            <p role="status">Sebentar, kami menyiapkan akun Anda.</p>
          </> : session ? <>
            <p className="eyebrow">HALAMAN AWAL</p>
            <h2 id="card-title">Selamat datang.</h2>
            <p>Anda masuk sebagai <strong className="account">{session.user.email}</strong>.</p>
            <div className="status-box">Akun Anda sudah terhubung. Fitur pencatatan kegiatan akan tersedia pada tahap berikutnya.</div>
            {error && <p className="error" role="alert">{error}</p>}
            <button onClick={signOut} disabled={busy}>{busy ? 'Sedang keluar…' : 'Keluar'}</button>
          </> : <>
            <p className="eyebrow">MULAI PERJALANANMU</p>
            <h2 id="card-title">Masuk ke logbook</h2>
            <p className="subtitle">Gunakan email dan kata sandi akun Anda.</p>
            <form onSubmit={signIn}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="username" placeholder="nama@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy} />
              <label htmlFor="password">Kata sandi</label>
              <input id="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
              {error && <p className="error" role="alert">{error}</p>}
              <button type="submit" disabled={busy}>{busy ? 'Sedang masuk…' : 'Masuk'}</button>
            </form>
            {error && <button className="secondary" onClick={() => setRetry(n => n + 1)} disabled={busy}>Periksa ulang sesi</button>}
            <p className="hint">Belum punya akun? Hubungi pengelola untuk mendapatkan akses.</p>
          </>}
        </section>
      </div>
      <footer>Logbook Magang Berbasis Bukti <span>·</span> Ruang untuk tumbuh, setiap hari.</footer>
    </main>
  )
}
