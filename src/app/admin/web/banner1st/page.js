"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, LayoutTemplate, UploadCloud, Link as LinkIcon, Image as ImageIcon, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const BannerSection1st = () => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [banners, setBanners] = useState([]);
    const [editBanner, setEditBanner] = useState(null);
    const [formData, setFormData] = useState({
        buttonLink: "",
        image: { url: "", key: "" },
        mobileImage: { url: "", key: "" },
    });

    const [uploading, setUploading] = useState(false);
    const [uploadingMobileImg, setUploadingMobileImg] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const mobileFileInputRef = useRef(null);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const response = await fetch(`/api/web/bannerSection1st`);
                const data = await response.json();
                setBanners(data);
            } catch (error) {
                toast.error("Failed to fetch banners", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        };
        fetchBanners();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const existingKey = formData.image?.key;
        if (existingKey) {
            try { await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' }); } catch (e) { }
        }
        try {
            const res = await fetch('/api/cloudinary', {
                method: 'POST',
                body: formDataUpload
            });
            const data = await res.json();
            if (res.ok && data.url) {
                setFormData(prev => ({ ...prev, image: { url: data.url, key: data.key || '' } }));
                toast.success('Image uploaded!', { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
            } else {
                toast.error('Cloudinary upload failed: ' + (data.error || 'Unknown error'), { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (err) {
            toast.error('Cloudinary upload error: ' + err.message, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        }
        setUploading(false);
    };

    const handleMobileImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingMobileImg(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const existingKey = formData.mobileImage?.key;
        if (existingKey) {
            try { await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' }); } catch (e) { }
        }
        try {
            const res = await fetch('/api/cloudinary', {
                method: 'POST',
                body: formDataUpload
            });
            const data = await res.json();
            if (res.ok && data.url) {
                setFormData(prev => ({ ...prev, mobileImage: { url: data.url, key: data.key || '' } }));
                toast.success('Image uploaded!', { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
            } else {
                toast.error('Cloudinary upload failed: ' + (data.error || 'Unknown error'), { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (err) {
            toast.error('Cloudinary upload error: ' + err.message, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        }
        setUploadingMobileImg(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.image.url || !formData.image.key) return toast.error("Please upload an image", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        if (!formData.mobileImage.url || !formData.mobileImage.key) return toast.error("Please upload a mobile image", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });

        setSubmitting(true);
        try {
            const method = editBanner ? "PATCH" : "POST";
            const payload = {
                ...formData,
                id: editBanner,
            };
            const response = await fetch("/api/web/bannerSection1st", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`Banner ${editBanner ? "updated" : "added"} successfully`, { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
                setEditBanner(null);

                const updatedBanners = await fetch(`/api/web/bannerSection1st`).then((res) => res.json());
                setBanners(updatedBanners);

                setFormData({
                    buttonLink: "",
                    image: { url: "", key: "" },
                    mobileImage: { url: "", key: "" },
                });

            } else {
                toast.error(data.error, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (error) {
            toast.error("Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (banner) => {
        setEditBanner(banner._id);
        setFormData({
            buttonLink: banner.buttonLink || "",
            image: banner.image || { url: "", key: "" },
            mobileImage: banner.mobileImage || { url: "", key: "" },
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch("/api/web/bannerSection1st", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Banner deleted successfully", { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
                setBanners((prev) => prev.filter((banner) => banner._id !== id));
            } else {
                toast.error(data.error, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (error) {
            toast.error("Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        }
    };

    const confirmDelete = async () => {
        if (bannerToDelete) {
            await handleDelete(bannerToDelete);
            setBannerToDelete(null);
            setShowDeleteModal(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setBannerToDelete(null);
    };

    const handleDeleteImage = async () => {
        const existingKey = formData.image?.key;
        if (existingKey) {
            try { await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' }); } catch (e) { }
        }
        setFormData(prev => ({ ...prev, image: { url: '', key: '' } }));
    };

    const handleDeleteMobileImage = async () => {
        const existingKey = formData.mobileImage?.key;
        if (existingKey) {
            try { await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' }); } catch (e) { }
        }
        setFormData(prev => ({ ...prev, mobileImage: { url: '', key: '' } }));
    };

    return (
        <div className="w-full max-w-360 mx-auto space-y-8 p-6 font-sans pb-24">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm rounded-full">
                            Web Settings
                        </span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                        First Banner Section
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">Manage desktop and mobile images for the first promotional section.</p>
                </div>
                {editBanner && (
                    <Button type="button" variant="outline" onClick={() => {
                        setEditBanner(null);
                        setFormData({ buttonLink: "", image: { url: "", key: "" }, mobileImage: { url: "", key: "" } });
                    }} className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-bold">
                        Cancel Editing
                    </Button>
                )}
            </div>

            <div className="space-y-8">
                {/* Form Section */}
                <div className="w-full">
                    <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                            <div className="flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5 text-slate-400" />
                                <CardTitle className="text-lg font-semibold text-slate-800">
                                    {editBanner ? "Edit First Banner Section" : "Add New First Banner Section"}
                                </CardTitle>
                            </div>
                            <CardDescription className="text-slate-500">Upload both desktop and mobile optimized images along with a target URL.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Desktop Image Upload */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-slate-600 ml-1">Laptop Image <span className="text-red-500">*</span></Label>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            ref={fileInputRef}
                                            className="hidden"
                                        />

                                        {!formData.image.url ? (
                                            <div
                                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                                className={`border-2 border-dashed rounded-2xl h-70 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
                                                    ${uploading ? 'bg-slate-50 border-slate-200' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 bg-slate-50/50'}`}
                                            >
                                                {uploading ? (
                                                    <>
                                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                        <p className="text-sm font-medium text-slate-600">Uploading...</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                            <UploadCloud className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div className="text-center px-4">
                                                            <p className="text-sm font-medium text-slate-700">Upload Laptop Image</p>
                                                            <p className="text-xs text-slate-500 mt-1">Recommended for desktop screens</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative w-full h-70 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 group">
                                                <Image
                                                    src={formData.image.url}
                                                    alt="Laptop Image Preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={handleDeleteImage}
                                                        className="w-12 h-12 rounded-full shadow-lg"
                                                    >
                                                        <Trash2Icon className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Mobile Image Upload */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> Mobile Image <span className="text-red-500">*</span></Label>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleMobileImageChange}
                                            ref={mobileFileInputRef}
                                            className="hidden"
                                        />

                                        {!formData.mobileImage.url ? (
                                            <div
                                                onClick={() => mobileFileInputRef.current && mobileFileInputRef.current.click()}
                                                className={`border-2 border-dashed rounded-2xl h-70 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
                                                    ${uploadingMobileImg ? 'bg-slate-50 border-slate-200' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 bg-slate-50/50'}`}
                                            >
                                                {uploadingMobileImg ? (
                                                    <>
                                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                        <p className="text-sm font-medium text-slate-600">Uploading...</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                            <UploadCloud className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div className="text-center px-4">
                                                            <p className="text-sm font-medium text-slate-700">Upload Mobile Image</p>
                                                            <p className="text-xs text-slate-500 mt-1">Recommended for smaller screens</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative w-full max-w-50 mx-auto h-70 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 group">
                                                <Image
                                                    src={formData.mobileImage.url}
                                                    alt="Mobile Image Preview"
                                                    fill
                                                    className="object-contain bg-slate-100"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={handleDeleteMobileImage}
                                                        className="w-12 h-12 rounded-full shadow-lg"
                                                    >
                                                        <Trash2Icon className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid gap-2 max-w-2xl">
                                        <Label className="text-sm font-medium text-slate-600 ml-1">Target URL</Label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                name="buttonLink"
                                                placeholder="https://example.com/promotion"
                                                type="url"
                                                value={formData.buttonLink}
                                                onChange={handleInputChange}
                                                className="h-11 pl-10 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3">
                                    <Button type="submit" className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all hover:shadow-md" disabled={submitting || uploading || uploadingMobileImg}>
                                        {submitting ? "Saving..." : editBanner ? "Update Banner" : "Add Banner"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Section */}
                <div className="w-full">
                    <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden h-full">
                        <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                                <CardTitle className="text-lg font-semibold text-slate-800">Existing First Banner Sections</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 mt-1">Review and manage your active promotional banners.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                                        <TableRow className="hover:bg-transparent border-0">
                                            <TableHead className="text-slate-500 font-medium h-12 w-16 text-center">#</TableHead>
                                            <TableHead className="text-slate-500 font-medium h-12 w-48 text-center">Desktop Image</TableHead>
                                            <TableHead className="text-slate-500 font-medium h-12 w-32 text-center">Mobile Image</TableHead>
                                            <TableHead className="text-slate-500 font-medium h-12">Target Link</TableHead>
                                            <TableHead className="text-slate-500 font-medium text-right pr-6 h-12">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {banners.length > 0 ? (
                                            banners.map((banner, index) => (
                                                <TableRow key={banner._id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                                    <TableCell className="text-center py-4 text-slate-500">{index + 1}</TableCell>
                                                    <TableCell className="py-4 text-center">
                                                        <div className="relative w-40 h-20 mx-auto rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                                            {banner.image?.url ? (
                                                                <Image src={banner.image.url} alt="Desktop Banner" fill className="object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-5 h-5 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center">
                                                        <div className="relative w-16 h-24 mx-auto rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                                            {banner.mobileImage?.url ? (
                                                                <Image src={banner.mobileImage.url} alt="Mobile Banner" fill className="object-cover" />
                                                            ) : (
                                                                <Smartphone className="w-5 h-5 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        {banner.buttonLink ? (
                                                            <a href={banner.buttonLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1 max-w-sm truncate" title={banner.buttonLink}>
                                                                <LinkIcon className="w-3.5 h-3.5 shrink-0" /> {banner.buttonLink}
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-400 text-sm">No link provided</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)} className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors">
                                                                <PencilIcon className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => { setShowDeleteModal(true); setBannerToDelete(banner._id); }} className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                                                <Trash2Icon className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan="5" className="text-center py-12 text-slate-400">
                                                    No banners found. Add a new advertisement to get started.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="rounded-3xl p-6 border-slate-100 shadow-xl bg-white max-w-md font-sans gap-0">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-semibold text-slate-800">Delete Banner</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-600 mb-6">Are you sure you want to delete this banner? This action cannot be undone.</p>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={cancelDelete} className="h-11 rounded-xl text-slate-600 hover:bg-slate-100 font-medium">Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} className="h-11 rounded-xl px-6 font-medium">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BannerSection1st;