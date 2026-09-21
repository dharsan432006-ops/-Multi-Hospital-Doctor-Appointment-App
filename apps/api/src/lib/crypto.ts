import crypto from 'node:crypto';
import { getConfig } from '../config/config.js';

/**
 * AES-256-GCM for sensitive fields (medicalNotesEnc).
 * Format: "v1:<base64 iv(12)>.<base64 tag(16)>.<base64 ciphertext>"
 * Rotation: decrypt tries current key, then PREV_ENCRYPTION_KEY.
 */
function keyBytes(b64: string): Buffer {
  const buf = Buffer.from(b64, 'base64');
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must decode to 32 bytes');
  return buf;
}

export function encryptText(plain: string): string {
  const { ENCRYPTION_KEY } = getConfig();
  const key = keyBytes(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptText(payload: string): string {
  const cfg = getConfig();
  const keys = [cfg.ENCRYPTION_KEY, cfg.PREV_ENCRYPTION_KEY].filter(Boolean) as string[];
  const m = payload.match(/^v1:([^.]+)\.([^.]+)\.(.+)$/);
  if (!m) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(m[1], 'base64');
  const tag = Buffer.from(m[2], 'base64');
  const data = Buffer.from(m[3], 'base64');
  let lastErr: unknown = null;
  for (const k of keys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(k), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Decryption failed');
}

/** Mask email/phone for logs and admin lists (minimal PHI exposure). */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const head = user.slice(0, 2);
  return `${head}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}
