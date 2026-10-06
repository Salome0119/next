const postgres = require('postgres');
const sql = postgres('postgresql://neondb_owner:npg_I0GvloFJgb9H@ep-noisy-snow-b4ua6988-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

// Backfill tasks to workspace 1 for user 1
sql`UPDATE tareas SET workspace_id = 1, assigned_to_user_id = 1 WHERE workspace_id IS NULL`.then(r => { 
  console.log('Updated:', r); 
  return sql`SELECT * FROM tareas`; 
}).then(r => { 
  console.log('Tareas after:', r); 
  return sql.end(); 
});