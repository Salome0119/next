import sql from '@/lib/db';
import { initWorkspaceDb } from '@/lib/workspace-db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
  hasCompletedOnboarding: boolean;
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  console.log('[HASH PASSWORD] starting hash...');
  const result = await bcrypt.hash(password, BCRYPT_ROUNDS);
  console.log('[HASH PASSWORD] done');
  return result;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || hash === '') return false;
  console.log('[VERIFY PASSWORD] comparing...');
  const result = await bcrypt.compare(password, hash);
  console.log('[VERIFY PASSWORD] result:', result);
  return result;
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
    hasCompletedOnboarding: user.has_completed_onboarding || false,
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
    hasCompletedOnboarding: user.has_completed_onboarding || false,
  };
}

export async function getUserByEmailOrCreate(email: string, name?: string): Promise<User> {
  await initDb();
  
  const existingUsers = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  if (existingUsers.length > 0) {
    const user = existingUsers[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      name: user.name,
      createdAt: user.created_at,
      hasCompletedOnboarding: user.has_completed_onboarding || false,
    };
  }

  // Create user without password for OAuth
  const users = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email.toLowerCase()}, '', ${name || null})
    RETURNING *
  `;

  const user = users[0];
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password_hash,
    name: user.name,
    createdAt: user.created_at,
    hasCompletedOnboarding: user.has_completed_onboarding || false,
  };
}

export async function initDb() {
  await initWorkspaceDb();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      has_completed_onboarding BOOLEAN DEFAULT FALSE
    );
  `;
  
  // Add columns if they don't exist (for existing databases)
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profession TEXT;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system'));
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es' CHECK (language IN ('es', 'en'));
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN DEFAULT TRUE;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS task_limit_alerts BOOLEAN DEFAULT TRUE;
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_creativity_level TEXT DEFAULT 'balanced' CHECK (ai_creativity_level IN ('precise', 'balanced', 'creative'));
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
  `;
}