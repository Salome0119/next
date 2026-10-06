const postgres = require('postgres');
const sql = postgres('postgresql://neondb_owner:npg_I0GvloFJgb9H@ep-noisy-snow-b4ua6988-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

sql`SELECT * FROM tareas`.then(r => { 
  console.log('Tareas:', r); 
  return sql.end(); 
});