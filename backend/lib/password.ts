import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);

// Try to load argon2, but DON'T crash if native build is missing
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let argon2: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  argon2 = require("argon2");
} catch (e) {
  console.warn("[auth] argon2 not available, falling back to scrypt:", (e as Error).message?.split("\n")[0]);
}

// --- scrypt fallback ---
// Format: $scrypt$N=16384,r=8,p=1$<salt-b64>$<hash-b64>
async function scryptHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `$scrypt$N=16384,r=8,p=1$${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function scryptVerify(hash: string, password: string): Promise<boolean> {
  try {
    const parts = hash.split("$");
    // ["", "scrypt", "N=...", "salt", "hash"]
    const salt = Buffer.from(parts[3], "base64");
    const expected = Buffer.from(parts[4], "base64");
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// --- Public API ---
export async function hashPassword(password: string): Promise<string> {
  if (argon2) {
    // ✅ FIX: Call the argon2 library directly, not this function
    return argon2.hash(password, { type: argon2.argon2id });
  }
  return scryptHash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  // Auto-detect which one was used
  if (hash.startsWith("$argon2")) {
    if (!argon2) {
      console.error("[auth] Password was hashed with argon2 but argon2 is not available on this device");
      return false;
    }
    try {
      // ✅ FIX: Call the argon2 library directly
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
  
  if (hash.startsWith("$scrypt$")) {
    return scryptVerify(hash, password);
  }
  
  // Legacy plain argon2 without prefix or old bcrypt hashes
  if (argon2) {
    try { 
      return await argon2.verify(hash, password); 
    } catch { 
      return false; 
    }
  }
  
  return false;
}

export function getHasherName(): string {
  return argon2 ? "argon2" : "scrypt (fallback)";
}