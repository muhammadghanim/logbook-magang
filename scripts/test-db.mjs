import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const name = `logbook-rls-${randomUUID()}`
const password = randomUUID()
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 180_000 })
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker gagal')
  return result.stdout.trim()
}
try {
  docker(['run', '-d', '--rm', '--name', name, '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:17-alpine'])
  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' })
    if (result.status === 0) { ready = true; break }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  if (!ready) throw new Error('PostgreSQL belum siap')
  for (const file of ['supabase/tests/bootstrap.sql', 'supabase/migrations/202611170001_create_entries.sql', 'supabase/tests/rls.sql']) {
    console.log(`Menjalankan ${file}`)
    const sql = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    console.log(docker(['exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], sql))
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8', timeout: 30_000 })
}
