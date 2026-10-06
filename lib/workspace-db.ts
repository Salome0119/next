import sql from '@/lib/db';

export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
}

export interface Invitation {
  id: number;
  workspace_id: number;
  email: string;
  role: 'admin' | 'member';
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invited_by: number;
  expires_at: Date;
  created_at: Date;
  accepted_at: Date | null;
}

export interface TaskWithWorkspace {
  id: number;
  titulo: string;
  prioridad: string;
  completado: boolean;
  creado_en: Date;
  workspace_id: number | null;
  assigned_to_user_id: number | null;
}

export async function initWorkspaceDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invitations (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')) DEFAULT 'pending',
      invited_by INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON invitations(workspace_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
  `;

  await sql`
    ALTER TABLE tareas 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
  `;
  await sql`
    ALTER TABLE tareas 
    ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_tareas_workspace_id ON tareas(workspace_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_tareas_assigned_to_user_id ON tareas(assigned_to_user_id);
  `;
}

export async function createDefaultWorkspaceForUser(userId: number): Promise<Workspace> {
  const workspaces = await sql`
    INSERT INTO workspaces (name, description, created_by)
    VALUES ('Personal', 'Tu espacio de trabajo personal', ${userId})
    RETURNING *
  `;
  const workspace = workspaces[0];

  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${workspace.id}, ${userId}, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING
  `;

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    created_by: workspace.created_by,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
  };
}

export async function backfillUserTasksToWorkspace(userId: number, workspaceId: number) {
  await sql`
    UPDATE tareas 
    SET workspace_id = ${workspaceId}
    WHERE workspace_id IS NULL
  `;
}