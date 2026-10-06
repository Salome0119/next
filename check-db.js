const postgres = require('postgres');
const sql = postgres('postgresql://neondb_owner:npg_I0GvloFJgb9H@ep-noisy-snow-b4ua6988-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

sql`SELECT * FROM users`.then(r => { 
  console.log('Users:', r); 
  return sql`SELECT * FROM workspaces`; 
}).then(r => { 
  console.log('Workspaces:', r); 
  return sql`SELECT * FROM workspace_members`; 
}).then(r => { 
  console.log('Members:', r); 
  return sql.end(); 
});