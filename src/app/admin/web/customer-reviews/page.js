"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2, UploadCloud, User, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_FORM = {
  name: "",
  designation: "",
  review: "",
  stars: 5,
  image: { url: "", key: "" },
};

const CustomerReviewsAdminPage = () => {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/web/customerReviews");
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load reviews");
      }
      setReviews(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      toast.error(error.message || "Failed to load reviews");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    const imageUrl =
      typeof item.image === "string"
        ? item.image
        : item.image?.url || "";
    const imageKey = item.image?.key || "";

    setForm({
      name: item.name || "",
      designation: item.designation || "",
      review: item.review || "",
      stars: Number(item.stars) || 5,
      image: { url: imageUrl, key: imageKey },
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("folder", "customer_reviews");

    try {
      const res = await fetch("/api/cloudinary", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({
          ...prev,
          image: { url: data.url, key: data.key || "" },
        }));
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({
      ...prev,
      image: { url: "", key: "" },
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.review.trim()) {
      toast.error("Review is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        designation: form.designation.trim(),
        review: form.review.trim(),
        stars: Number(form.stars),
        image: form.image?.url ? form.image : { url: "", key: "" },
      };

      const res = await fetch("/api/web/customerReviews", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to save review");
      }

      toast.success(
        editingId ? "Review updated successfully" : "Review added successfully",
      );
      resetForm();
      await fetchReviews();
    } catch (error) {
      toast.error(error.message || "Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/web/customerReviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to delete review");
      }

      toast.success("Review deleted");
      if (editingId === id) resetForm();
      setReviews((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      toast.error(error.message || "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex w-full max-w-full flex-col gap-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl text-heading md:text-4xl">
          Customer Reviews
        </h1>
        <p className="font-body text-sm text-muted">
          Add customer photo, name, designation, review text, and a star rating (1–5)
          for the homepage carousel.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-border/50 md:p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">
            {editingId ? "Edit Review" : "Add Review"}
          </h2>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>

        {/* Customer Photo Upload */}
        <div className="space-y-2">
          <Label>Customer Photo (Optional)</Label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/30">
              {form.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.image.url}
                  alt="Customer avatar preview"
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-8 text-muted" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="customer-image-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                {isUploadingImage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UploadCloud className="size-4" />
                )}
                {isUploadingImage
                  ? "Uploading..."
                  : form.image?.url
                    ? "Change Photo"
                    : "Upload Photo"}
              </Button>

              {form.image?.url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted">
            Square photo recommended. Will be shown as a full-circle avatar in the reviews section.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer name</Label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Sarah M."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-designation">Designation</Label>
            <Input
              id="customer-designation"
              value={form.designation}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, designation: e.target.value }))
              }
              placeholder="e.g. Local diner · Pickup regular"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-review">Review</Label>
          <Textarea
            id="customer-review"
            value={form.review}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, review: e.target.value }))
            }
            placeholder="Write the customer review..."
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Stars (1–5)</Label>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const active = Number(form.stars) >= value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, stars: value }))
                  }
                  className={`inline-flex size-10 items-center justify-center rounded-xl border transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted"
                  }`}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`size-5 ${active ? "fill-primary text-primary" : ""}`}
                  />
                </button>
              );
            })}
            <span className="ml-1 text-sm font-medium text-muted">
              {form.stars} / 5
            </span>
          </div>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editingId ? "Update Review" : "Add Review"}
            </>
          )}
        </Button>
      </form>

      <div className="space-y-4 rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-border/50 md:p-8">
        <h2 className="text-lg font-semibold text-heading">Saved reviews</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="font-body text-sm text-muted">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((item) => {
              const itemImg =
                typeof item.image === "string"
                  ? item.image
                  : item.image?.url;
              return (
                <div
                  key={item._id}
                  className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted/40">
                      {itemImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={itemImg}
                          alt={item.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted">
                          {item.name ? item.name.charAt(0).toUpperCase() : "U"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-heading">
                          {item.name}
                        </span>
                        {item.designation ? (
                          <span className="text-sm text-muted">
                            · {item.designation}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`size-3.5 ${
                              index < item.stars
                                ? "fill-primary text-primary"
                                : "text-border"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="max-w-3xl text-sm leading-relaxed text-foreground">
                        “{item.review}”
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      aria-label="Edit review"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      disabled={deletingId === item._id}
                      onClick={() => handleDelete(item._id)}
                      aria-label="Delete review"
                    >
                      {deletingId === item._id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReviewsAdminPage;
