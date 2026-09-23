import fs from 'fs';
import path from 'path';
import cloudinary from '../src/config/cloudinary.js';
import { logger } from '../src/utils/index.js';

const photosDir = path.join(process.cwd(), 'uploads', 'photos');

async function migratePhotos() {
  if (!fs.existsSync(photosDir)) {
    console.log('No local photos directory found at:', photosDir);
    return;
  }

  const files = fs.readdirSync(photosDir).filter(f => !f.startsWith('.'));
  console.log(`Found ${files.length} local photos to migrate.`);

  const mappings = {};

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(photosDir, filename);
    const publicId = path.parse(filename).name;

    try {
      console.log(`[${i + 1}/${files.length}] Uploading ${filename} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'sfa_uploads',
        public_id: publicId,
        overwrite: false,
      });

      mappings[`/uploads/photos/${filename}`] = result.secure_url;
      console.log(`  ✓ Uploaded: ${result.secure_url}`);
    } catch (err) {
      console.error(`  ✗ Failed to upload ${filename}:`, err.message);
    }
  }

  const mappingPath = path.join(process.cwd(), 'uploads', 'cloudinary-mappings.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mappings, null, 2));
  console.log(`\n🎉 Migration complete! ${Object.keys(mappings).length} photos uploaded.`);
  console.log(`Mappings saved to: ${mappingPath}`);
}

migratePhotos()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
