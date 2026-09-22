"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import {toast} from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const GallerySection = () => {
  const [images, setImages] = useState([]);
  const [loadedImages, setLoadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await fetch("/api/web/gallerySection");
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.message || "Failed to load gallery");
        }

        setImages(result.data?.images || []);
      } catch {
        toast.error("Failed to load gallery images");
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, []);

  const handleImageLoad = (index) => {
    setLoadedImages((prev) => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
  };

  const saveImagesToDatabase = async (updatedImages) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/web/gallerySection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: updatedImages }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save images");
      }

      setImages(data.data?.images || updatedImages);
      toast.success("Images saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save images");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    const newFiles = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/cloudinary", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Image upload failed");

        const result = await res.json();
        newFiles.push({ url: result.url, key: result.key });
      }

      const updatedGallery = [...images, ...newFiles];
      setImages(updatedGallery);
      await saveImagesToDatabase(updatedGallery);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (key) => {
    try {
      const deleteImage = await fetch("/api/web/gallerySection", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      const data = await deleteImage.json();

      if (!deleteImage.ok || !data.success) {
        throw new Error(data.message || "Failed to delete image");
      }

      setImages(data.data?.images || images.filter((file) => file.key !== key));
      toast.success("Image deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete image");
    }
  };

  return (
    <div className="flex w-full max-w-full flex-col gap-8 rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-border/50 md:p-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl text-heading md:text-4xl">
          Gallery Section
        </h1>
        <p className="font-body text-sm text-muted">
          Upload multiple images at once for the homepage gallery carousel.
        </p>
      </div>

      <div className="space-y-2 w-full">
        <Label>Gallery Images</Label>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="aspect-video animate-pulse rounded-[var(--radius-card)] bg-surface"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 w-full">
            {images.length > 0 ? (
              images.map((file, index) => (
                <div
                  key={file.key || index}
                  className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-border group"
                >
                  {!loadedImages.includes(index) && (
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-surface">
                      <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                  )}

                  <Image
                    src={file.url || "/placeholder.png"}
                    alt={`Gallery preview ${index + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-500 ${
                      loadedImages.includes(index)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                    onLoad={() => handleImageLoad(index)}
                  />

                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-heading/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => handleRemoveImage(file.key)}
                      aria-label="Remove image"
                    >
                      <X className="size-4 bg-red-900 text-white " />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="font-body text-sm text-muted">
                No images uploaded yet.
              </p>
            )}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageUpload}
        />

        <Button
          type="button"
          className="mt-6"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isSaving || isLoading}
        >
          {uploading || isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {uploading ? "Uploading..." : "Saving..."}
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Upload Images
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default GallerySection;
