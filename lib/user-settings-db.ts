import sql from '@/lib/db';
import { initWorkspaceDb } from '@/lib/workspace-db';
import { initDb } from '@/lib/auth-utils';

export interface UserSettings {
  id: number;
  userId: number;
  avatarUrl: string | null;
  profession: string | null;
  theme: 'dark' | 'light' | 'system';
  language: 'es' | 'en';
  emailNotifications: boolean;
  weeklyDigest: boolean;
  taskLimitAlerts: boolean;
  aiCreativityLevel: 'precise' | 'balanced' | 'creative';
  createdAt: Date;
  updatedAt: Date;
}

export interface AiUsageMetrics {
  id: number;
  userId: number;
  month: string;
  tokensUsed: number;
  tokensLimit: number;
  generationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiGenerationHistory {
  id: number;
  userId: number;
  prompt: string;
  tokensUsed: number;
  model: string;
  createdAt: Date;
}

function mapUserSettings(row: any): UserSettings {
  return {
    id: row.userId,
    userId: row.userId,
    avatarUrl: row.avatarUrl,
    profession: row.profession,
    theme: row.theme,
    language: row.language,
    emailNotifications: row.emailNotifications,
    weeklyDigest: row.weeklyDigest,
    taskLimitAlerts: row.taskLimitAlerts,
    aiCreativityLevel: row.aiCreativityLevel,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

function mapAiUsageMetrics(row: any): AiUsageMetrics {
  return {
    id: row.id,
    userId: row.userId,
    month: row.month,
    tokensUsed: row.tokensUsed,
    tokensLimit: row.tokensLimit,
    generationsCount: row.generationsCount,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

function mapAiGenerationHistory(row: any): AiGenerationHistory {
  return {
    id: row.id,
    userId: row.userId,
    prompt: row.prompt,
    tokensUsed: row.tokensUsed,
    model: row.model,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

export async function initUserSettingsDb() {
  await initDb();
  await initWorkspaceDb();

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS profession TEXT,
    ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es' CHECK (language IN ('es', 'en')),
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS task_limit_alerts BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS ai_creativity_level TEXT DEFAULT 'balanced' CHECK (ai_creativity_level IN ('precise', 'balanced', 'creative')),
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ai_usage_metrics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      tokens_limit INTEGER DEFAULT 100000,
      generations_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, month)
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_user_id ON ai_usage_metrics(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_month ON ai_usage_metrics(month);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ai_generation_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      model TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_generation_history_user_id ON ai_generation_history(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_generation_history_created_at ON ai_generation_history(created_at DESC);
  `;
}

export async function getUserSettings(userId: number): Promise<UserSettings | null> {
  await initUserSettingsDb();
  const users = await sql`
    SELECT 
      id as "userId",
      avatar_url as "avatarUrl",
      profession,
      theme,
      language,
      email_notifications as "emailNotifications",
      weekly_digest as "weeklyDigest",
      task_limit_alerts as "taskLimitAlerts",
      ai_creativity_level as "aiCreativityLevel",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users 
    WHERE id = ${userId}
  `;
  
  if (users.length === 0) return null;
  
  return mapUserSettings(users[0]);
}

export async function updateUserProfile(userId: number, data: {
  name?: string;
  profession?: string | null;
  avatarUrl?: string | null;
}): Promise<UserSettings | null> {
  await initUserSettingsDb();
  
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.profession !== undefined) {
    updates.push(`profession = $${paramIndex++}`);
    values.push(data.profession);
  }
  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatarUrl);
  }

  if (updates.length === 0) return getUserSettings(userId);

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId); // WHERE id = $N

  const setClause = updates.join(', ');
  const whereClause = `WHERE id = $${paramIndex}`;
  const returningClause = `
    RETURNING 
      id as "userId",
      avatar_url as "avatarUrl",
      profession,
      theme,
      language,
      email_notifications as "emailNotifications",
      weekly_digest as "weeklyDigest",
      task_limit_alerts as "taskLimitAlerts",
      ai_creativity_level as "aiCreativityLevel",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const query = `UPDATE users SET ${setClause} ${whereClause} ${returningClause}`;

  console.log('[DB UPDATE PROFILE] userId:', userId, 'query:', query, 'values:', values);
  const users = await sql.unsafe(query, values);
  console.log('[DB UPDATE PROFILE] result rows:', users.length);
  return users.length > 0 ? mapUserSettings(users[0]) : null;
}

export async function updateUserPreferences(userId: number, data: {
  theme?: 'dark' | 'light' | 'system';
  language?: 'es' | 'en';
  emailNotifications?: boolean;
  weeklyDigest?: boolean;
  taskLimitAlerts?: boolean;
  aiCreativityLevel?: 'precise' | 'balanced' | 'creative';
}): Promise<UserSettings | null> {
  await initUserSettingsDb();
  
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [userId];
  let paramIndex = 2;

  if (data.theme !== undefined) {
    updates.push(`theme = $${paramIndex++}`);
    values.push(data.theme);
  }
  if (data.language !== undefined) {
    updates.push(`language = $${paramIndex++}`);
    values.push(data.language);
  }
  if (data.emailNotifications !== undefined) {
    updates.push(`email_notifications = $${paramIndex++}`);
    values.push(data.emailNotifications);
  }
  if (data.weeklyDigest !== undefined) {
    updates.push(`weekly_digest = $${paramIndex++}`);
    values.push(data.weeklyDigest);
  }
  if (data.taskLimitAlerts !== undefined) {
    updates.push(`task_limit_alerts = $${paramIndex++}`);
    values.push(data.taskLimitAlerts);
  }
  if (data.aiCreativityLevel !== undefined) {
    updates.push(`ai_creativity_level = $${paramIndex++}`);
    values.push(data.aiCreativityLevel);
  }

  if (updates.length === 0) return getUserSettings(userId);

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `
    UPDATE users 
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING 
      id as "userId",
      avatar_url as "avatarUrl",
      profession,
      theme,
      language,
      email_notifications as "emailNotifications",
      weekly_digest as "weeklyDigest",
      task_limit_alerts as "taskLimitAlerts",
      ai_creativity_level as "aiCreativityLevel",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const users = await sql.unsafe(query, values);
  return users.length > 0 ? mapUserSettings(users[0]) : null;
}

export async function getAiUsageMetrics(userId: number, month?: string): Promise<AiUsageMetrics | null> {
  await initUserSettingsDb();
  
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  
  const metrics = await sql`
    SELECT 
      id,
      user_id as "userId",
      month,
      tokens_used as "tokensUsed",
      tokens_limit as "tokensLimit",
      generations_count as "generationsCount",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM ai_usage_metrics
    WHERE user_id = ${userId} AND month = ${targetMonth}
  `;

  if (metrics.length === 0) {
    const newMetrics = await sql`
      INSERT INTO ai_usage_metrics (user_id, month, tokens_used, tokens_limit, generations_count)
      VALUES (${userId}, ${targetMonth}, 0, 100000, 0)
      RETURNING 
        id,
        user_id as "userId",
        month,
        tokens_used as "tokensUsed",
        tokens_limit as "tokensLimit",
        generations_count as "generationsCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    return newMetrics.length > 0 ? mapAiUsageMetrics(newMetrics[0]) : null;
  }

  return mapAiUsageMetrics(metrics[0]);
}

export async function incrementAiUsage(userId: number, tokensUsed: number): Promise<AiUsageMetrics | null> {
  await initUserSettingsDb();
  
  const month = new Date().toISOString().slice(0, 7);
  
  const metrics = await sql`
    INSERT INTO ai_usage_metrics (user_id, month, tokens_used, tokens_limit, generations_count)
    VALUES (${userId}, ${month}, ${tokensUsed}, 100000, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET 
      tokens_used = ai_usage_metrics.tokens_used + ${tokensUsed},
      generations_count = ai_usage_metrics.generations_count + 1,
      updated_at = CURRENT_TIMESTAMP
    RETURNING 
      id,
      user_id as "userId",
      month,
      tokens_used as "tokensUsed",
      tokens_limit as "tokensLimit",
      generations_count as "generationsCount",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return metrics.length > 0 ? mapAiUsageMetrics(metrics[0]) : null;
}

export async function addAiGenerationHistory(userId: number, prompt: string, tokensUsed: number, model?: string): Promise<AiGenerationHistory | null> {
  await initUserSettingsDb();
  
  const history = await sql`
    INSERT INTO ai_generation_history (user_id, prompt, tokens_used, model)
    VALUES (${userId}, ${prompt}, ${tokensUsed}, ${model || 'gpt-4o-mini'})
    RETURNING 
      id,
      user_id as "userId",
      prompt,
      tokens_used as "tokensUsed",
      model,
      created_at as "createdAt"
  `;

  return history.length > 0 ? mapAiGenerationHistory(history[0]) : null;
}

export async function getAiGenerationHistory(userId: number, limit: number = 10): Promise<AiGenerationHistory[]> {
  await initUserSettingsDb();
  
  const history = await sql`
    SELECT 
      id,
      user_id as "userId",
      prompt,
      tokens_used as "tokensUsed",
      model,
      created_at as "createdAt"
    FROM ai_generation_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return history.map(mapAiGenerationHistory);
}

export async function getUserWithEmail(userId: number): Promise<{ id: number; email: string; name: string | null; emailVerified: boolean } | null> {
  await initWorkspaceDb();
  
  const users = await sql`
    SELECT id, email, name, COALESCE(email_verified, FALSE) as "emailVerified"
    FROM users
    WHERE id = ${userId}
  `;
  
  if (users.length === 0) return null;
  
  const row = users[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.emailVerified,
  };
}

export async function updateUserPassword(userId: number, newPasswordHash: string): Promise<boolean> {
  await initWorkspaceDb();
  
  const result = await sql`
    UPDATE users 
    SET password_hash = ${newPasswordHash}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
  
  return result.count > 0;
}

export async function deleteUserAccount(userId: number): Promise<boolean> {
  await initWorkspaceDb();
  
  const result = await sql`
    DELETE FROM users WHERE id = ${userId}
  `;
  
  return result.count > 0;
}

export async function exportUserData(userId: number): Promise<{
  user: { id: number; email: string; name: string | null; createdAt: Date };
  settings: UserSettings | null;
  aiUsage: AiUsageMetrics[];
  aiHistory: AiGenerationHistory[];
  workspaces: any[];
  tasks: any[];
} | null> {
  await initWorkspaceDb();
  
  const [userResult, settings, aiUsage, aiHistory, workspaces, tasks] = await Promise.all([
    sql`SELECT id, email, name, created_at as "createdAt" FROM users WHERE id = ${userId}`,
    getUserSettings(userId),
    sql`SELECT * FROM ai_usage_metrics WHERE user_id = ${userId} ORDER BY month DESC`,
    getAiGenerationHistory(userId, 100),
    sql`SELECT w.*, wm.role FROM workspaces w JOIN workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = ${userId}`,
    sql`SELECT * FROM tareas WHERE assigned_to_user_id = ${userId} ORDER BY creado_en DESC`,
  ]);

  if (userResult.length === 0) return null;

  return {
    user: {
      id: userResult[0].id,
      email: userResult[0].email,
      name: userResult[0].name,
      createdAt: userResult[0].createdAt instanceof Date ? userResult[0].createdAt : new Date(userResult[0].createdAt),
    },
    settings,
    aiUsage: aiUsage.map(mapAiUsageMetrics),
    aiHistory,
    workspaces,
    tasks,
  };
}