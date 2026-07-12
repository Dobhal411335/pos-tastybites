import { uploadImage } from './uploadImage';

export const uploadMultipleImages = async (fileBuffers, folder = 'restaurant') => {
  if (!Array.isArray(fileBuffers) || fileBuffers.length === 0) {
    throw new Error('No files provided for upload');
  }

  const uploadPromises = fileBuffers.map((buffer) => uploadImage(buffer, folder));
  
  // Uses Promise.all to upload concurrently
  return await Promise.all(uploadPromises);
};
