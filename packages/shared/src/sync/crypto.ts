const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LEN = 16;
const ENC_PREFIX = 'enc:';
const ENC_ITERATIONS = 200_000;

export function makePairingCode(): string {
  const buf = new Uint32Array(CODE_LEN);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('');
}

export function normalizeCode(code: string): string {
  return String(code ?? '').trim().normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function houseIdFor(code: string): Promise<string> {
  return sha256Hex(normalizeCode(code));
}

async function deriveKey(code: string): Promise<CryptoKey> {
  const normalized = normalizeCode(code);
  const saltDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`koten.e2ee.salt.v1|${normalized}`));
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalized), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(saltDigest), iterations: ENC_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}
function base64ToBytes(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function isCiphertext(value: unknown): value is string {
  return typeof value === 'string' && value.slice(0, ENC_PREFIX.length) === ENC_PREFIX;
}

export async function encryptField(fieldName: string, code: string, value: unknown): Promise<string> {
  const key = await deriveKey(code);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value === undefined ? null : value));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(fieldName) },
    key,
    data,
  ));
  const combined = new Uint8Array(iv.length + cipher.length);
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  return ENC_PREFIX + bytesToBase64(combined);
}

export async function decryptField(fieldName: string, code: string, text: string): Promise<unknown> {
  const key = await deriveKey(code);
  const combined = base64ToBytes(text.slice(ENC_PREFIX.length));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(fieldName) },
    key,
    cipher,
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
