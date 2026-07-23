import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Require a 32-byte key for AES-256
// For safety if not provided, fallback to a deterministic hash of something so it doesn't crash, but log a warning
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  console.warn('WARNING: ENCRYPTION_KEY is not set or not 32 bytes (64 hex characters) in environment. Using a fallback key for development.');
  ENCRYPTION_KEY = crypto.createHash('sha256').update(String(process.env.NEXTAUTH_SECRET || 'tastybites_fallback_key')).digest('hex');
}

const KEY = Buffer.from(ENCRYPTION_KEY, 'hex');

export function encryptString(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptString(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Failed to decrypt string:', error);
    return null;
  }
}
