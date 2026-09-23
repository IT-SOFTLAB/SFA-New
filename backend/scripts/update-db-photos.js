import fs from 'fs';
import path from 'path';
import pg from 'pg';
import 'dotenv/config';

const mappingFile = path.join(process.cwd(), 'uploads', 'cloudinary-mappings.json');
if (!fs.existsSync(mappingFile)) {
  console.log('No mapping file found');
  process.exit(0);
}

const mappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  console.log('Connected to Database successfully.');

  let updatedVisits = 0;
  for (const [oldUrl, newUrl] of Object.entries(mappings)) {
    const res = await client.query('UPDATE "Visit" SET "photoUrl" = $1 WHERE "photoUrl" = $2', [newUrl, oldUrl]);
    if (res.rowCount > 0) {
      console.log(`Updated Visit photoUrl: ${oldUrl} -> ${newUrl}`);
      updatedVisits += res.rowCount;
    }
  }

  const tasksRes = await client.query('SELECT id, photos FROM "Task" WHERE photos IS NOT NULL');
  let updatedTasks = 0;
  for (const row of tasksRes.rows) {
    if (row.photos) {
      let changed = false;
      let newPhotos = row.photos;
      if (Array.isArray(newPhotos)) {
        newPhotos = newPhotos.map(p => {
          if (mappings[p]) {
            changed = true;
            return mappings[p];
          }
          return p;
        });
      } else if (typeof newPhotos === 'string' && mappings[newPhotos]) {
        newPhotos = mappings[newPhotos];
        changed = true;
      }

      if (changed) {
        await client.query('UPDATE "Task" SET photos = $1 WHERE id = $2', [JSON.stringify(newPhotos), row.id]);
        updatedTasks++;
        console.log(`Updated Task id ${row.id} photos array.`);
      }
    }
  }

  console.log(`Summary: ${updatedVisits} visits updated, ${updatedTasks} tasks updated.`);
  client.release();
  await pool.end();
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Update DB error:', err.message);
    process.exit(0);
  });
