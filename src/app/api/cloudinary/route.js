import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary/uploadImage';
import { deleteImage } from '@/lib/cloudinary/deleteImage';
import { validateImage } from '@/lib/cloudinary/utils/imageValidator';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'restaurant';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Pre-validate
    validateImage(file);

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to cloudinary
    const result = await uploadImage(buffer, folder);

    // Result typically contains secure_url and public_id (key)
    return NextResponse.json({
      url: result.secure_url || result.url,
      key: result.public_id || result.key,
      success: true
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ error: 'Image upload failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required to delete' }, { status: 400 });
    }

    await deleteImage(key);

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return NextResponse.json({ error: 'Image deletion failed', details: error.message }, { status: 500 });
  }
}
