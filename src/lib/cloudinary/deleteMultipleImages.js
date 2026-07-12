import cloudinary from './config';

export const deleteMultipleImages = async (public_ids) => {
  if (!Array.isArray(public_ids) || public_ids.length === 0) {
    throw new Error('An array of public_ids is required to delete multiple images');
  }

  return new Promise((resolve, reject) => {
    cloudinary.api.delete_resources(public_ids, { resource_type: 'image' }, (error, result) => {
      if (error) {
        console.error('Cloudinary delete multiple error:', error);
        return reject(new Error('Failed to delete multiple images from Cloudinary'));
      }
      resolve(result);
    });
  });
};
