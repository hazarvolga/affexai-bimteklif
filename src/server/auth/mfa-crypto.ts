import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function encryptionKey(encoded: string): Buffer {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error('MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('Invalid MFA encryption key');
  return key;
}

export function encryptMfaSecret(secret: Buffer, key: string, userId: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), nonce);
  cipher.setAAD(Buffer.from(`bimmetraj:mfa:v1:${userId}`));
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptMfaSecret(value: string, key: string, userId: string): Buffer {
  const [version, nonceValue, tagValue, payload, extra] = value.split('.');
  if (version !== 'v1' || !nonceValue || !tagValue || !payload || extra) throw new Error('Invalid MFA ciphertext');
  const nonce = Buffer.from(nonceValue, 'base64url');
  const tag = Buffer.from(tagValue, 'base64url');
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('Invalid MFA ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), nonce);
  decipher.setAAD(Buffer.from(`bimmetraj:mfa:v1:${userId}`));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(payload, 'base64url')), decipher.final()]);
}

export function totpForCounter(secret: Buffer, counter: number, digits = 6): string {
  if (!Number.isSafeInteger(counter) || counter < 0 || ![6, 8].includes(digits)) throw new Error('Invalid TOTP counter or digits');
  const input = Buffer.alloc(8); input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(input).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).padStart(digits, '0');
}

export function matchTotpCounter(secret: Buffer, code: string, epochSeconds: number, lastCounter: number): number | null {
  if (!/^\d{6}$/.test(code) || !Number.isSafeInteger(epochSeconds) || epochSeconds < 0) return null;
  const counter = Math.floor(epochSeconds / 30);
  for (const candidate of [counter - 1, counter, counter + 1]) {
    if (candidate <= lastCounter || candidate < 0) continue;
    if (timingSafeEqual(Buffer.from(totpForCounter(secret, candidate)), Buffer.from(code))) return candidate;
  }
  return null;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g)!.join('-'));
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(`bimmetraj:mfa-recovery:v1:${code.replace(/-/g, '').toUpperCase()}`).digest('hex');
}

export function base32(secret: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0; let value = 0; let out = '';
  for (const byte of secret) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { bits -= 5; out += alphabet[(value >>> bits) & 31]; } }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
