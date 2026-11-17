import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function validateConfig() {
  if (!url || !key || url.includes('YOUR_PROJECT_ID') || key.includes('YOUR_SUPABASE')) {
    return 'Konfigurasi Supabase belum diisi. Salin .env.example ke .env.local, isi URL proyek dan publishable key, lalu mulai ulang server.'
  }
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return 'VITE_SUPABASE_URL harus berupa URL HTTP/HTTPS yang valid.'
  }
  // Frontend hanya boleh menggunakan publishable key atau legacy anon key.
  if (key.startsWith('sb_secret_')) return 'Gunakan publishable key, bukan secret key, di frontend.'
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const claims = JSON.parse(atob(payload))
      if (claims.role !== 'anon') throw new Error()
    } catch {
      return 'Kunci tidak valid untuk frontend. Gunakan publishable key atau legacy anon key.'
    }
  }
  return null
}

export const configError = validateConfig()
export const supabase = configError ? null : createClient(url, key)
