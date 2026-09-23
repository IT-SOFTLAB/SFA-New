import { v2 as cloudinary } from 'cloudinary';
import config from './env.js';
import { logger } from '../utils/index.js';

if (config.CLOUDINARY.cloudName && config.CLOUDINARY.apiKey && config.CLOUDINARY.apiSecret) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY.cloudName,
    api_key: config.CLOUDINARY.apiKey,
    api_secret: config.CLOUDINARY.apiSecret,
    secure: true,
  });
  logger.info('☁️  Cloudinary successfully configured.');
} else {
  logger.warn('⚠️  Cloudinary environment variables missing. File uploads to Cloudinary will fail.');
}

export default cloudinary;
