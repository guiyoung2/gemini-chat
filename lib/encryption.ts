import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

// 환경변수에서 키 로드 및 유효성 검증
function loadKey(envVar: string): Buffer {
  const hex = process.env[envVar]
  if (!hex) throw new Error(`${envVar} 환경변수가 설정되지 않았습니다`)
  if (hex.length !== 64) throw new Error(`${envVar}는 64자리 hex(32바이트)여야 합니다. 현재: ${hex.length}자`)
  return Buffer.from(hex, 'hex')
}

const getEncKey = () => loadKey('ENCRYPTION_KEY')
const getHashKey = () => loadKey('HASH_KEY')

// AES-256-GCM 암호화 → "iv:authTag:ciphertext" (hex)
export function encrypt(plaintext: string): string {
  const key = getEncKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

// AES-256-GCM 복호화
export function decrypt(ciphertext: string): string {
  const key = getEncKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('잘못된 암호화 포맷: iv:authTag:data 형식이어야 합니다')

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

// HMAC-SHA256 검색용 해시 (동일 값 → 동일 해시, 역산 불가)
export function hashForLookup(value: string): string {
  const key = getHashKey()
  return createHmac('sha256', key).update(value, 'utf8').digest('hex')
}
