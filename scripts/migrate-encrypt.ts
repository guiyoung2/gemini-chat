import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { encrypt, hashForLookup } from '../lib/encryption'

// .env.local 수동 파싱 (dotenv 미설치 환경 대응)
function loadEnv(filePath: string) {
  try {
    const content = readFileSync(resolve(filePath), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    // .env.local 파일이 없으면 환경변수는 이미 설정된 것으로 간주
  }
}

loadEnv('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 설정되지 않았습니다')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// auth.users → profiles 배치 암호화 마이그레이션
async function migrate() {
  console.log('auth.users 조회 중...')

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    console.error('유저 조회 실패:', error.message)
    process.exit(1)
  }

  const users = data.users
  console.log(`총 ${users.length}명 마이그레이션 시작\n`)

  let success = 0
  let failed = 0

  for (const user of users) {
    try {
      const email = user.email
      if (!email) {
        console.warn(`[SKIP] ${user.id} - email 없음`)
        continue
      }

      const rawFullName: unknown = user.user_metadata?.full_name
      const fullName = typeof rawFullName === 'string' && rawFullName ? rawFullName : null

      const row = {
        id: user.id,
        email: encrypt(email),
        email_hash: hashForLookup(email),
        full_name: fullName ? encrypt(fullName) : null,
        full_name_hash: fullName ? hashForLookup(fullName) : null,
        updated_at: new Date().toISOString(),
      }

      const { error: upsertError } = await admin
        .from('profiles')
        .upsert(row, { onConflict: 'id' })

      if (upsertError) throw upsertError

      console.log(`[OK] ${user.id} (${email})`)
      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[FAIL] ${user.id} - ${msg}`)
      failed++
    }
  }

  console.log(`\n완료: 성공 ${success}건 / 실패 ${failed}건`)
}

migrate()
