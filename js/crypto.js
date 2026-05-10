// ─── KEY GENERATION ──────────────────────────────────────────────────────────
// Password → SHA-256 → 32-byte AES key
export async function generateKeyFromPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(hashBuffer);
}

async function encryptBlockECB(block, rawKey) {
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CBC' }, false, ['encrypt']
  );
  const zeroIV = new Uint8Array(16);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: zeroIV }, key, block
  );
  return new Uint8Array(encrypted).slice(0, 16);
}

async function decryptBlockECB(cipherBlock, rawKey) {
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CBC' }, false, ['decrypt']
  );
  const zeroIV = new Uint8Array(16);
  const paddingPlain = new Uint8Array(16).fill(16); // PKCS7: 16 bytes of value 16
  const encKey = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CBC' }, false, ['encrypt']
  );
  const secondBlock = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: cipherBlock }, encKey, paddingPlain
  )).slice(0, 16);
  
  const twoBlocks = new Uint8Array(32);
  twoBlocks.set(cipherBlock, 0);
  twoBlocks.set(secondBlock, 16);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: zeroIV }, key, twoBlocks
  );
  return new Uint8Array(decrypted).slice(0, 16);
}

export async function encryptECB(rgb, rawKey) {
  const result = new Uint8Array(rgb.length);
  for (let i = 0; i < rgb.length; i += 16) {
    const block = new Uint8Array(16);
    block.set(rgb.slice(i, Math.min(i + 16, rgb.length)));
    const enc = await encryptBlockECB(block, rawKey);
    result.set(enc, i);
  }
  return result;
}

export async function decryptECB(encRgb, rawKey) {
  const result = new Uint8Array(encRgb.length);
  for (let i = 0; i < encRgb.length; i += 16) {
    const block = new Uint8Array(16);
    block.set(encRgb.slice(i, Math.min(i + 16, encRgb.length)));
    const dec = await decryptBlockECB(block, rawKey);
    result.set(dec, i);
  }
  return result;
}

// ─── CBC MODE ───────────────────────────────────────────────────────────────
// Each block XOR'd with previous ciphertext before encryption
// Requires a random IV for the first block
// Identical plaintext → different ciphertext (IV randomizes output)

export function generateCBCIV() {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function encryptCBC(rgb, rawKey, iv) {
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CBC' }, false, ['encrypt']
  );
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-CBC', iv }, key, rgb
);
  // Store full encrypted length including padding — needed for correct decryption
  return new Uint8Array(encrypted);
}

export async function decryptCBC(encRgb, rawKey, iv, originalLength) {
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CBC' }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv }, key, encRgb
  );
  // Trim back to original pixel data length
  return new Uint8Array(decrypted).slice(0, originalLength);
}

// PKCS7 padding — pad data to multiple of blockSize
function padPKCS7(data, blockSize) {
  const padLen = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  padded.fill(padLen, data.length);
  return padded;
}

// ─── CTR MODE ───────────────────────────────────────────────────────────────
// AES used as a keystream generator — counter block encrypted → XOR with plaintext
// No padding needed, fully parallelizable, symmetric (encrypt = decrypt)

export function generateCTRNonce() {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function encryptCTR(rgb, rawKey, nonce) {
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CTR' }, false, ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: nonce, length: 64 }, key, rgb
  );
  return new Uint8Array(encrypted);
}

export async function decryptCTR(encRgb, rawKey, nonce) {
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-CTR' }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: nonce, length: 64 }, key, encRgb
  );
  return new Uint8Array(decrypted);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}