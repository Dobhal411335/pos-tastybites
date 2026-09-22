import connectDB from "@/lib/db";
import GallerySection from "@/models/Web/GallerySection";
import { deleteImage } from "@/lib/cloudinary/deleteImage";
import { deleteMultipleImages } from "@/lib/cloudinary/deleteMultipleImages";

function serializeImages(images = []) {
  return images
    .filter((image) => image?.url && image?.key)
    .map((image) => ({
      url: image.url,
      key: image.key,
    }));
}

async function deleteCloudinaryKeys(keys = []) {
  const uniqueKeys = [...new Set(keys.filter((key) => typeof key === "string" && key.trim()))];
  if (uniqueKeys.length === 0) return;

  if (uniqueKeys.length === 1) {
    try {
      await deleteImage(uniqueKeys[0]);
    } catch (err) {
      console.error(`Failed to delete Cloudinary image with key ${uniqueKeys[0]}:`, err);
    }
    return;
  }

  try {
    await deleteMultipleImages(uniqueKeys);
  } catch (err) {
    console.error("Failed to delete Cloudinary images:", err);
    for (const key of uniqueKeys) {
      try {
        await deleteImage(key);
      } catch (singleErr) {
        console.error(`Failed to delete Cloudinary image with key ${key}:`, singleErr);
      }
    }
  }
}

async function getOrCreateGalleryDoc() {
  await connectDB();
  let gallery = await GallerySection.findOne();
  if (!gallery) {
    gallery = await GallerySection.create({ images: [] });
  }
  return gallery;
}

export async function getGallerySection() {
  const gallery = await getOrCreateGalleryDoc();
  return {
    _id: String(gallery._id),
    images: serializeImages(gallery.images),
  };
}

export async function saveGalleryImages(images) {
  if (!Array.isArray(images)) {
    throw new Error("Images must be an array");
  }

  const gallery = await getOrCreateGalleryDoc();
  const nextImages = serializeImages(images);
  const nextKeys = new Set(nextImages.map((image) => image.key));
  const removedKeys = (gallery.images || [])
    .map((image) => image?.key)
    .filter((key) => key && !nextKeys.has(key));

  await deleteCloudinaryKeys(removedKeys);

  gallery.images = nextImages;
  await gallery.save();

  return {
    _id: String(gallery._id),
    images: serializeImages(gallery.images),
  };
}

export async function deleteGalleryImage(key) {
  if (!key) {
    throw new Error("Image key is required");
  }

  const gallery = await getOrCreateGalleryDoc();
  const imageExists = gallery.images.some((image) => image.key === key);

  if (!imageExists) {
    throw new Error("Image not found");
  }

  await deleteCloudinaryKeys([key]);
  gallery.images = gallery.images.filter((image) => image.key !== key);
  await gallery.save();

  return {
    _id: String(gallery._id),
    images: serializeImages(gallery.images),
  };
}
