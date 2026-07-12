import cloudinary from './config';

export const deleteImage = async (public_id) => {
  if (!public_id) {
    throw new Error('public_id is required to delete an image');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(public_id, { resource_type: 'image' }, (error, result) => {
      if (error) {
        console.error('Cloudinary delete error:', error);
        return reject(new Error('Failed to delete image from Cloudinary'));
      }
      resolve(result);
    });
  });
};
