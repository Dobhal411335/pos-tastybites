import {
  deleteGalleryImage,
  getGallerySection,
  saveGalleryImages,
} from "@/components/services/gallerySection.service";

export const GET = async () => {
  try {
    const data = await getGallerySection();
    return Response.json(
      {
        success: true,
        message: "Gallery section fetched successfully",
        data,
      },
      { status: 200 }
    );
  } catch {
    return Response.json(
      {
        success: false,
        message: "Failed to fetch gallery section",
        data: null,
      },
      { status: 500 }
    );
  }
};

export const POST = async (req) => {
  try {
    const body = await req.json();
    const { images } = body;

    if (!Array.isArray(images)) {
      return Response.json(
        {
          success: false,
          message: "Images must be an array",
          data: null,
        },
        { status: 400 }
      );
    }

    const data = await saveGalleryImages(images);
    return Response.json(
      {
        success: true,
        message: "Gallery images saved successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to save gallery images",
        data: null,
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (req) => {
  try {
    const body = await req.json();
    const { key } = body;

    if (!key) {
      return Response.json(
        {
          success: false,
          message: "Image key is required",
          data: null,
        },
        { status: 400 }
      );
    }

    const data = await deleteGalleryImage(key);
    return Response.json(
      {
        success: true,
        message: "Gallery image deleted successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    const status = error.message === "Image not found" ? 404 : 500;
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to delete gallery image",
        data: null,
      },
      { status }
    );
  }
};
