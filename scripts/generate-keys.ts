import { randomBytes } from 'crypto'

// ENCRYPTION_KEY, HASH_KEY 생성 후 .env.local 추가 형식 출력
const encryptionKey = randomBytes(32).toString('hex')
const hashKey = randomBytes(32).toString('hex')

console.log('\n아래 두 줄을 .env.local에 추가하세요:\n')
console.log(`ENCRYPTION_KEY='${encryptionKey}'`)
console.log(`HASH_KEY='${hashKey}'`)
console.log('\n⚠️  키를 안전한 곳에 백업하세요. 분실 시 암호화된 데이터 복구 불가능합니다.\n')
