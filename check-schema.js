const postgres = require('postgres');
const sql = postgres('postgresql://neondb_owner:npg_I0GvloFJgb9H@ep-noisy-snow-b4ua6988-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

async function checkSchema() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('TABLES:', tables);
  
  for (const t of tables) {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ${t.table_name}`;
    console.log(`\n${t.table_name.toUpperCase()}:`, cols);
  }
  
  await sql.end();
}

checkSchema().catch(console.error);