"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  LayoutTemplate,
  ImageIcon,
  PencilIcon,
  Trash2Icon,
  Link as LinkIcon,
  Tag,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DeleteDialog from "@/components/common/DeleteDialog";
import imageCompression from "browser-image-compression";
import { slugifyOfferName } from "@/utils/offerDetails";

const emptyForm = () => ({
  image: { url: "", key: "" },
  link: "",
});

const ManageBanners = () => {
  const fileInputRef = useRef(null);
  const [banners, setBanners] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState({
    id: null,
    imageKey: null,
  });
  const [offerPickerOpen, setOfferPickerOpen] = useState(false);
  const [activeOffers, setActiveOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const fetchBanners = async () => {
    try {
      const response = await fetch(`/api/web/managebanners`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setBanners(data.data);
      } else {
        setBanners([]);
        toast.error("Failed to load banners");
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Failed to fetch banners");
      setBanners([]);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchActiveOffers = async () => {
    setLoadingOffers(true);
    try {
      const response = await fetch(`/api/menu/offers?active=1`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setActiveOffers(data.data.filter((o) => o.status !== false));
      } else {
        setActiveOffers([]);
        toast.error("Failed to load active offers");
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      setActiveOffers([]);
      toast.error("Failed to fetch offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const openOfferPicker = async () => {
    setOfferPickerOpen(true);
    await fetchActiveOffers();
  };

  const handleSelectOffer = (offer) => {
    const slug = slugifyOfferName(offer.slug || offer.name);
    if (!slug) {
      toast.error("This offer needs a slug. Edit it under Promotions → Offers.");
      return;
    }
    setFormData((prev) => ({ ...prev, link: `/menu?offer=${slug}` }));
    setOfferPickerOpen(false);
    toast.success(`Link set to /menu?offer=${slug}`);
  };

  const handleEdit = (banner) => {
    setEditingId(banner._id);
    setFormData({
      image: banner.image || { url: "", key: "" },
      link: banner.link || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image?.url) {
      return toast.error("Please upload a banner image");
    }
    if (!String(formData.link || "").trim()) {
      return toast.error("Please enter a link URL");
    }

    setSubmitting(true);
    try {
      const dataToSend = {
        link: formData.link.trim(),
        image: formData.image,
      };

      const url = editingId
        ? `/api/web/managebanners/${editingId}`
        : "/api/web/managebanners";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save banner");
      }

      toast.success(editingId ? "Banner updated" : "Banner added");
      setFormData(emptyForm());
      setEditingId(null);
      await fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error(error.message || "Failed to save banner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveImage = async () => {
    const existingKey = formData.image?.key;
    if (existingKey) {
      try {
        await fetch(`/api/cloudinary?key=${existingKey}`, { method: "DELETE" });
      } catch (e) {
        console.error("Failed to delete image", e);
      }
    }
    setFormData((prev) => ({ ...prev, image: { url: "", key: "" } }));
  };

  const handleDelete = (id, imageKey) => {
    setBannerToDelete({ id, imageKey });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const { id, imageKey } = bannerToDelete;
    try {
      if (imageKey) {
        try {
          await fetch(`/api/cloudinary?key=${imageKey}`, { method: "DELETE" });
        } catch (e) {
          console.error("Failed to delete image", e);
        }
      }

      const response = await fetch(`/api/web/managebanners/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete banner");
      }

      toast.success("Banner deleted");
      await fetchBanners();

      if (editingId === id) {
        setEditingId(null);
        setFormData(emptyForm());
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setShowDeleteModal(false);
      setBannerToDelete({ id: null, imageKey: null });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(emptyForm());
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const existingKey = formData.image?.key;
      if (existingKey) {
        try {
          await fetch(`/api/cloudinary?key=${existingKey}`, {
            method: "DELETE",
          });
        } catch {
          /* ignore */
        }
      }

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const formDataUpload = new FormData();
      formDataUpload.append("file", compressedFile);
      const res = await fetch("/api/cloudinary", {
        method: "POST",
        body: formDataUpload,
      });
      if (!res.ok) throw new Error("Image upload failed");
      const result = await res.json();
      setFormData((prev) => ({
        ...prev,
        image: { url: result.url, key: result.key },
      }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto w-full max-w-360 space-y-8 p-6 pb-24 font-sans">
      <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700 shadow-sm">
              Web Settings
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 drop-shadow-sm md:text-5xl">
            Hero Banners
          </h1>
          <p className="mt-2 font-medium text-slate-500">
            Upload homepage hero images and set the click-through link for each
            banner. Add as many as you need — they rotate on the landing page.
          </p>
        </div>
        {editingId ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelEdit}
            className="h-11 rounded-xl border-slate-200 px-6 font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel Editing
          </Button>
        ) : null}
      </div>

      <div className="space-y-8">
        <div className="w-full">
          <Card className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {editingId ? "Edit Banner" : "Add New Banner"}
                </CardTitle>
              </div>
              <CardDescription className="text-slate-500">
                Only an image and a destination URL are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-2">
                  <Label className="ml-1 text-sm font-medium text-slate-600">
                    Link URL <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      name="link"
                      placeholder="e.g. /menu or /menu?offer=lunch-combo"
                      value={formData.link}
                      onChange={handleChange}
                      required
                      className="h-11 flex-1 rounded-xl border-slate-200 bg-slate-50/50 transition-colors hover:bg-slate-50 focus-visible:border-slate-400 focus-visible:ring-slate-200"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openOfferPicker}
                      className="h-11 shrink-0 rounded-xl border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Tag className="mr-2 h-4 w-4 text-orange-500" />
                      Pick offer
                    </Button>
                  </div>
                  <p className="ml-1 text-xs text-slate-500">
                    Pick an active offer to set{" "}
                    <span className="font-mono text-slate-700">/menu?offer=slug</span>, or
                    type any URL manually.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="ml-1 text-sm font-medium text-slate-600">
                    Banner Image <span className="text-red-500">*</span>
                  </Label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />

                  {!formData.image?.url ? (
                    <div
                      onClick={() =>
                        !uploading && fileInputRef.current?.click()
                      }
                      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors ${
                        uploading
                          ? "cursor-default border-slate-200 bg-slate-50"
                          : "cursor-pointer border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {uploading ? (
                        <>
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                          <p className="text-sm font-medium text-slate-600">
                            Uploading...
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                            <UploadCloud className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-slate-700">
                              Click to upload image
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Recommended: 1200×900 px or similar
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="group relative h-96 w-full overflow-hidden rounded-2xl">
                      <Image
                        src={formData.image.url}
                        alt="Banner preview"
                        height={900}
                        width={1200}
                        className="h-full w-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={handleRemoveImage}
                          className="h-10 w-10 rounded-full bg-red-500 text-white shadow-lg"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    className="h-11 flex-1 rounded-xl bg-slate-900 font-medium text-white transition-all hover:bg-slate-800 hover:shadow-md"
                    disabled={submitting || uploading}
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                        ? "Update Banner"
                        : "Add Banner"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <Card className="h-full overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Existing Banners
                  <span className="ml-2 text-sm font-bold text-slate-400">
                    ({banners.length})
                  </span>
                </CardTitle>
              </div>
              <CardDescription className="mt-1 text-slate-500">
                These images appear in the homepage hero carousel.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-slate-50/50 p-6">
              {banners.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {banners.map((banner) => (
                    <div
                      key={banner._id}
                      className="group relative overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:border-slate-200 hover:shadow-md"
                    >
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                        <Image
                          src={banner.image?.url || ""}
                          alt="Hero banner"
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <div className="mb-5 flex items-center gap-1.5 text-sm text-slate-500">
                          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate" title={banner.link}>
                            {banner.link}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleEdit(banner)}
                            className="h-9 flex-1 rounded-xl border-slate-200 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            <PencilIcon className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(banner._id, banner.image?.key)
                            }
                            className="h-9 w-9 shrink-0 rounded-xl bg-red-500 text-white transition-colors hover:bg-red-600"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="mb-1 text-lg font-medium text-slate-800">
                    No banners yet
                  </h3>
                  <p className="text-slate-500">
                    Add a hero banner image and link using the form above.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteDialog
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Banner"
        description="Are you sure you want to delete this hero banner? This action cannot be undone."
      />

      <Dialog open={offerPickerOpen} onOpenChange={setOfferPickerOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Choose an active offer
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Selecting an offer fills the banner link with its slug so the menu can
              open filtered to that offer.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
            {loadingOffers ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading offers…
              </div>
            ) : activeOffers.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                No active offers found. Create one under Promotions → Offers.
              </div>
            ) : (
              <ul className="space-y-2">
                {activeOffers.map((offer) => {
                  const slug = slugifyOfferName(offer.slug || offer.name);
                  return (
                    <li key={offer._id}>
                      <button
                        type="button"
                        onClick={() => handleSelectOffer(offer)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/40"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {offer.image?.url ? (
                            <Image
                              src={offer.image.url}
                              alt={offer.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Tag className="h-4 w-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {offer.name}
                          </p>
                          <p className="truncate font-mono text-xs text-slate-500">
                            /menu?offer={slug || "—"}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-orange-600">
                          ${Number(offer.price || 0).toFixed(2)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageBanners;
