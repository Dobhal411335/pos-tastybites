import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary/uploadImage';
import { uploadMultipleImages } from '@/lib/cloudinary/uploadMultipleImages';
import { validateImage } from '@/lib/cloudinary/utils/imageValidator';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file'); // Can accept multiple files under 'file' key
    const folder = formData.get('folder') || 'restaurant';

    if (!files || files.length === 0) {
      return sendError(new Error('No files provided'), 'No files provided', 400);
    }

    // Pre-validate all files before uploading
    files.forEach((file) => validateImage(file));

    // Convert files to Buffers for Cloudinary upload_stream
    const buffers = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer);
      })
    );

    let result;
    if (buffers.length === 1) {
      result = await uploadImage(buffers[0], folder);
    } else {
      result = await uploadMultipleImages(buffers, folder);
    }

    return sendSuccess(result, 'Images uploaded successfully');
  } catch (error) {
    return sendError(error, 'Image upload failed', 500);
  }
}
