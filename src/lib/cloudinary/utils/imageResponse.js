export const formatImageResponse = (cloudinaryResult) => {
  return {
    secure_url: cloudinaryResult.secure_url,
    public_id: cloudinaryResult.public_id,
    width: cloudinaryResult.width,
    height: cloudinaryResult.height,
    format: cloudinaryResult.format,
    bytes: cloudinaryResult.bytes,
  };
};
