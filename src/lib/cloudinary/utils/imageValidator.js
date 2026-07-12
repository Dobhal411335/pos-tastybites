const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateImage = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!ALLOWED_FORMATS.includes(file.type)) {
    throw new Error('Invalid file format. Only JPEG, PNG, and WebP are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  return true;
};
