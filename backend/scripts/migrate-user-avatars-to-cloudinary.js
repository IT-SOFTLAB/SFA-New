import pg from 'pg';
import cloudinary from '../src/config/cloudinary.js';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrateAvatars() {
  console.log('Connecting to database...');
  const client = await pool.connect();

  const res = await client.query('SELECT id, email, "avatarUrl" FROM "User" WHERE "avatarUrl" IS NOT NULL');
  console.log(`Found ${res.rows.length} users with avatarUrl.`);

  let migratedCount = 0;

  for (const user of res.rows) {
    const avatar = user.avatarUrl;
    if (!avatar) continue;

    // Check if it's already a Cloudinary / HTTP URL
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      console.log(`- ${user.email}: already an HTTP URL. Skipping.`);
      continue;
    }

    // It's a Base64 string! Upload to Cloudinary
    if (avatar.startsWith('data:image')) {
      try {
        console.log(`- Uploading base64 avatar for ${user.email} (${Math.round(avatar.length / 1024)} KB)...`);
        const uploadRes = await cloudinary.uploader.upload(avatar, {
          folder: 'sfa_uploads/avatars',
          public_id: `avatar-${user.id}`,
          overwrite: true,
        });

        const newUrl = uploadRes.secure_url;
        await client.query('UPDATE "User" SET "avatarUrl" = $1 WHERE id = $2', [newUrl, user.id]);
        console.log(`  ✓ Successfully updated ${user.email} -> ${newUrl}`);
        migratedCount++;
      } catch (err) {
        console.error(`  ✗ Failed for ${user.email}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Avatar migration finished: ${migratedCount} avatars migrated to Cloudinary!`);
  client.release();
  await pool.end();
}

migrateAvatars()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
