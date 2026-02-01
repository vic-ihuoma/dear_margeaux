/**
 * Password hashing utilities for Cloudflare Workers
 * Uses Web Crypto API compatible PBKDF2 since Argon2 requires Node.js
 */

const ITERATIONS = 100000;
const KEY_LENGTH = 64; // 512 bits
const ALGORITHM = 'PBKDF2';

/**
 * Generates a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Converts Uint8Array to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives a key from password and salt using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: ALGORITHM },
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-512',
    },
    passwordKey,
    KEY_LENGTH * 8 // bits
  );
}

/**
 * Hashes a password with PBKDF2
 * Returns format: algorithm$iterations$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await deriveKey(password, salt);

  return `pbkdf2$${ITERATIONS}$${bufferToHex(salt.buffer as ArrayBuffer)}$${bufferToHex(hash)}`;
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const salt = hexToBuffer(parts[2]);
  const expectedHash = parts[3];

  if (iterations !== ITERATIONS) {
    // Could support migration here, but for now require matching iterations
    return false;
  }

  const derivedHash = await deriveKey(password, salt);
  const derivedHashHex = bufferToHex(derivedHash);

  // Constant-time comparison to prevent timing attacks
  if (derivedHashHex.length !== expectedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < derivedHashHex.length; i++) {
    result |= derivedHashHex.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }

  return result === 0;
}
