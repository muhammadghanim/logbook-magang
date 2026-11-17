import { useEffect, useState } from 'react'
import { configError, supabase } from './lib/supabase'

function ArrowIcon() {
  return <svg className="arrow-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function SparkIcon() {
  return <svg className="spark-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}

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
    <main className="shell" id="beranda">
      <a className="skip-link" href="#akses-akun">Langsung ke akses akun</a>
      <header className="topbar">
        <a className="brand" href="#beranda" aria-label="Logbook Magang, beranda">
          <svg className="brand-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 5h12a8 8 0 0 1 8 8v14H13a8 8 0 0 1-8-8V5Z" stroke="currentColor" strokeWidth="2.5" /><path d="M11 5v15a2 2 0 0 0 2 2h12M16 11h4M16 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <span>logbook<span className="brand-period">.</span></span>
        </a>
        <span className="nav-caption">Tempat cerita magangmu.</span>
        <a className="nav-action" href="#akses-akun">{session ? 'Akun saya' : 'Akses akun'} <ArrowIcon /></a>
      </header>
      <section className="intro" aria-labelledby="hero-title">
        <p className="eyebrow hero-eyebrow"><span className="tiny-star"><SparkIcon /></span> LOGBOOK MAGANG BERBASIS BUKTI</p>
        <h1 id="hero-title">Beri ruang untuk<br />cerita <span className="highlight">magangmu<svg viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true"><path d="M4 10Q180-2 395 8M24 14Q215 3 373 12" /></svg></span>.</h1>
        <p className="hero-description">Ada hal baru di setiap hari magang. Beri tempat untuk kegiatan,<br className="desktop-break" /> hasil kerja, dan semua proses belajarmu.</p>
      </section>
      <div className="account-stage">
        <div className="stage-orbit orbit-one" aria-hidden="true" />
        <div className="stage-orbit orbit-two" aria-hidden="true" />
        <aside className="paper-note" aria-label="Pesan penyemangat">
          <span className="note-tape" aria-hidden="true" />
          <span className="note-label">CATATAN UNTUKMU</span>
          <p>Hal kecil hari ini.<br />Cerita besar<br /><span>nanti.</span></p>
          <svg className="note-doodle" viewBox="0 0 100 50" fill="none" aria-hidden="true"><path d="M5 13q30 35 69 3m-13-9 17 8-8 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="note-bottom">nikmati prosesnya :)</span>
        </aside>
        <section id="akses-akun" tabIndex="-1" className="card" aria-labelledby="card-title" aria-busy={loading || busy}>
          <div className="card-topline"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>RUANG PRIBADIMU</span><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="5" y="9" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.4" /></svg></div>
          <div className="card-content">
          {configError ? <>
            <div className="card-symbol"><ArrowIcon /></div>
            <p className="eyebrow">TINGGAL SATU LANGKAH</p>
            <h2 id="card-title">Hubungkan Supabase</h2>
            <p className="subtitle">Siapkan koneksi akun untuk memulai perjalananmu.</p>
            <div className="config-message" role="status">{configError}</div>
            <p className="hint">Petunjuk lengkap tersedia di README.md. Login akan tersedia setelah konfigurasi terisi.</p>
          </> : loading ? <>
            <div className="card-symbol loading-symbol"><SparkIcon /></div>
            <h2 id="card-title">Memeriksa sesi…</h2>
            <p className="subtitle" role="status">Sebentar, kami menyiapkan akun Anda.</p>
          </> : session ? <>
            <div className="card-symbol" aria-hidden="true">✓</div>
            <p className="eyebrow">SENANG KAMU DI SINI</p>
            <h2 id="card-title">Selamat datang.</h2>
            <p className="subtitle">Anda masuk sebagai <strong className="account">{session.user.email}</strong>.</p>
            <div className="status-box">Akun Anda sudah terhubung. Fitur pencatatan kegiatan akan tersedia pada tahap berikutnya.</div>
            {error && <p className="error" role="alert">{error}</p>}
            <button onClick={signOut} disabled={busy}>{busy ? 'Sedang keluar…' : 'Keluar'}</button>
          </> : <>
            <div className="card-symbol"><SparkIcon /></div>
            <p className="eyebrow">LANGKAH PERTAMA, MULAI DI SINI</p>
            <h2 id="card-title">Masuk ke logbook</h2>
            <p className="subtitle">Ruang kecil untuk perjalanan besarmu.</p>
            <form onSubmit={signIn}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="username" placeholder="nama@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy} />
              <label htmlFor="password">Kata sandi</label>
              <input id="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
              {error && <p className="error" role="alert">{error}</p>}
              <button type="submit" disabled={busy}>{busy ? 'Sedang masuk…' : 'Masuk'}<ArrowIcon /></button>
            </form>
            {error && <button className="secondary" onClick={() => setRetry(n => n + 1)} disabled={busy}>Periksa ulang sesi</button>}
            <p className="hint">Belum punya akun? Hubungi pengelola untuk mendapatkan akses.</p>
          </>}
          </div>
          <div className="card-bottomline"><span className="status-dot" aria-hidden="true" /> Satu akun. Ceritamu sendiri.</div>
        </section>
        <div className="side-sticker" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none"><path d="m50 3 7 24 22-13-12 23 26 6-25 10 16 22-25-9-5 27-11-24-21 16 7-25-26-6 25-11L14 21l25 9Z" fill="currentColor" /><circle cx="42" cy="43" r="3" fill="#f4e83e" /><circle cx="58" cy="43" r="3" fill="#f4e83e" /><path d="M39 55q11 13 22 0" stroke="#f4e83e" strokeWidth="3" strokeLinecap="round" /></svg><span>one day<br />at a time.</span></div>
      </div>
      <p className="page-signoff">Sedikit demi sedikit, jadi banyak cerita.<SparkIcon /></p>
      <footer><span>© {new Date().getFullYear()} Logbook Magang</span><span>Dibuat untuk proses, bukan cuma hasil.</span><a href="#beranda">Kembali ke atas <span aria-hidden="true">↑</span></a></footer>
    </main>
  )
}
