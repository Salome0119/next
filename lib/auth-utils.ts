import sql from '@/lib/db';
import { initWorkspaceDb } from '@/lib/workspace-db';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
}

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const HASH_ALGORITHM = 'SHA-256';

async function deriveKey(password: string, salt: BufferSource): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKey(password, salt);

  const hashArray = new Uint8Array(derivedKey);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    const derivedKey = await deriveKey(password, salt);
    const derivedHash = new Uint8Array(derivedKey);

    if (storedHash.length !== derivedHash.length) return false;

    let result = 0;
    for (let i = 0; i < storedHash.length; i++) {
      result |= storedHash[i] ^ derivedHash[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await initDb();
  const users = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  if (users.length === 0) return null;

  const user = users[0];
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password_hash,
    name: user.name,
    createdAt: user.created_at,
  };
}

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  await initDb();
  const passwordHash = await hashPassword(password);

  const users = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email.toLowerCase()}, ${passwordHash}, ${name || null})
    RETURNING *
  `;

  const user = users[0];
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password_hash,
    name: user.name,
    createdAt: user.created_at,
  };
}

async function initDb() {
  await initWorkspaceDb();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}