import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const res = await pool.query('SELECT id, email, "firstName", "avatarUrl" FROM "User"');
  console.log('Total users:', res.rows.length);
  const withAvatars = res.rows.filter(r => r.avatarUrl);
  console.log('Users with avatarUrl:', withAvatars.length);
  for (const u of withAvatars) {
    console.log(`- ${u.email}: length=${u.avatarUrl?.length}, preview=${u.avatarUrl?.substring(0, 50)}`);
  }
  await pool.end();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
