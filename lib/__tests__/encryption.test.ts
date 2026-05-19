import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt, hashForLookup } from "../encryption";

// 테스트용 32바이트 키 (64자리 hex) — 실제 .env 키와 무관
const TEST_ENC_KEY = "0".repeat(64);
const TEST_HASH_KEY = "a".repeat(64);

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_ENC_KEY;
  process.env.HASH_KEY = TEST_HASH_KEY;
});

describe("encrypt / decrypt", () => {
  it("암호화 후 복호화하면 원본 문자열이 복원된다", () => {
    const plaintext = "hello, 세계!";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("빈 문자열도 라운드트립이 성공한다", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("동일 평문을 두 번 암호화하면 IV가 달라 결과가 매번 다르다", () => {
    const plaintext = "same input";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("암호문 형식은 iv:authTag:ciphertext (콜론 2개)", () => {
    const parts = encrypt("test").split(":");
    expect(parts).toHaveLength(3);
    // 각 파트는 유효한 hex 문자열
    parts.forEach((p) => expect(p).toMatch(/^[0-9a-f]+$/));
  });

  it("authTag를 변조하면 복호화가 실패한다", () => {
    const [iv, authTag, data] = encrypt("tamper me").split(":");
    // authTag 첫 두 자리를 반전시켜 변조
    const flipped = authTag.startsWith("ff") ? "00" + authTag.slice(2) : "ff" + authTag.slice(2);
    expect(() => decrypt(`${iv}:${flipped}:${data}`)).toThrow();
  });

  it("암호문(data) 부분을 변조하면 복호화가 실패한다", () => {
    const [iv, authTag, data] = encrypt("tamper data").split(":");
    const tampered = data.startsWith("ff") ? "00" + data.slice(2) : "ff" + data.slice(2);
    expect(() => decrypt(`${iv}:${authTag}:${tampered}`)).toThrow();
  });

  it("잘못된 형식의 문자열을 복호화하면 에러가 발생한다", () => {
    expect(() => decrypt("not:valid")).toThrow("iv:authTag:data 형식이어야 합니다");
  });
});

describe("hashForLookup", () => {
  it("동일 값은 항상 같은 해시를 반환한다", () => {
    const value = "user@example.com";
    expect(hashForLookup(value)).toBe(hashForLookup(value));
  });

  it("서로 다른 값은 다른 해시를 반환한다", () => {
    expect(hashForLookup("a@example.com")).not.toBe(hashForLookup("b@example.com"));
  });

  it("반환값은 64자리 hex 문자열이다 (HMAC-SHA256)", () => {
    expect(hashForLookup("test")).toMatch(/^[0-9a-f]{64}$/);
  });
});
