import cloudinary from './config';
import { formatImageResponse } from './utils/imageResponse';

export const uploadImage = async (fileBuffer, folder = 'restaurant') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp', // Auto-optimization format
        quality: 'auto', // Auto quality
        unique_filename: true,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error('Failed to upload image to Cloudinary'));
        }
        resolve(formatImageResponse(result));
      }
    );

    // Convert Buffer to Stream and pipe to Cloudinary
    uploadStream.end(fileBuffer);
  });
};
