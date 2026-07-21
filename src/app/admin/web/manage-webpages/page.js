'use client';

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {toast} from "sonner"
import { Pencil, Trash, Link as LinkIcon, Plus, FileText, Settings, ExternalLink, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ManageWebpages = () => {
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm();
    const [editItem, setEditItem] = useState(null);
    const [webpages, setWebpages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const formRef = useRef(null);

    // Fetch webpages on component mount
    useEffect(() => {
        const fetchPages = async () => {
            setLoading(true);
            try {
                const response = await fetch("/api/web/getAllPages");
                const data = await response.json();
                setWebpages(data.pages || []);
            } catch (error) {
                toast.error(`Error fetching pages: ${error.message}`, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            } finally {
                setLoading(false);
            }
        };
        fetchPages();
    }, []);

    const onEdit = (page) => {
        setEditItem(page._id);
        setValue("title", page.title);
        setValue("url", page.url);
        
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleCancelEdit = () => {
        setEditItem(null);
        reset({ title: "", url: "" });
    };

    const onDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this webpage?")) return;
        
        try {
            const response = await fetch("/api/web/getAllPages", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (response.ok) {
                toast.success("Webpage deleted successfully", { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
                setWebpages(webpages.filter((page) => page._id !== id));
            } else {
                toast.error("Failed to delete webpage", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (error) {
            toast.error("Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        }
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const method = editItem ? "PATCH" : "POST";
            const payload = {
                id: editItem ? editItem : undefined,
                title: data.title,
                url: data.url,
            };
            
            const response = await fetch("/api/web/getAllPages", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const res = await response.json();

            if (response.ok) {
                toast.success(`Webpage ${editItem ? "updated" : "created"} successfully`, { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
                
                // Fetch updated list instead of reload for smoother UX
                const updatedPages = await fetch("/api/web/getAllPages").then((res) => res.json());
                setWebpages(updatedPages.pages || []);
                
                setEditItem(null);
                reset({ title: "", url: "" });
            } else {
                toast.error(`Failed to ${editItem ? "update" : "create"} webpage: ${res.message || 'Unknown error'}`, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (error) {
            toast.error(`Something went wrong: ${error.message}`, {
                style: {
                    borderRadius: "10px",
                    border: "1px solid #fee2e2",
                    background: "#fef2f2",
                    color: "#991b1b"
                },
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-360 mx-auto space-y-8 p-6 font-sans pb-24 mt-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm rounded-full">
                            Web Settings
                        </span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                        Manage Custom Webpages
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">Create and manage custom links and pages for your application.</p>
                </div>
            </div>

            <div className="space-y-8" ref={formRef}>
                {/* Form Card (Top) */}
                <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-blue-600" />
                                <CardTitle className="text-lg font-semibold text-slate-800">
                                    {editItem ? "Edit Webpage" : "Create New Webpage"}
                                </CardTitle>
                            </div>
                            {editItem && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleCancelEdit}
                                    className="h-8 text-slate-500 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4 mr-1" /> Cancel Edit
                                </Button>
                            )}
                        </div>
                        <CardDescription className="text-slate-500 mt-1">
                            {editItem ? "Update the details of the selected webpage." : "Add a new webpage link to your platform."}
                        </CardDescription>
                    </CardHeader>
                    
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="title" className="text-slate-700 font-medium">Page Title <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="title"
                                        {...register("title", { required: "Title is required" })} 
                                        placeholder="e.g., Summer Promotion" 
                                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50" 
                                    />
                                    {errors.title && <span className="text-xs text-red-500">{errors.title.message}</span>}
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="url" className="text-slate-700 font-medium">Page URL (Link) <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <LinkIcon className="w-4 h-4" />
                                        </div>
                                        <Input
                                            id="url"
                                            {...register("url", { required: "URL is required" })}
                                            className="h-11 pl-9 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50"
                                            placeholder="e.g., https://example.com/promo or /page/promo"
                                        />
                                    </div>
                                    {errors.url && <span className="text-xs text-red-500">{errors.url.message}</span>}
                                </div>
                            </div>
                        </CardContent>
                        
                        <CardFooter className="bg-slate-50/80 border-t border-slate-100 p-6 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8 shadow-sm transition-all"
                            >
                                {editItem ? (
                                    <>Update Webpage</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Add Webpage</>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Table Card (Bottom) */}
                <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <CardTitle className="text-lg font-semibold text-slate-800">Existing Webpages</CardTitle>
                            <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                {webpages.length} Total
                            </Badge>
                        </div>
                        <CardDescription className="text-slate-500 mt-1">A complete list of your created webpages.</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                                    <TableRow className="hover:bg-transparent border-0">
                                        <TableHead className="text-slate-500 font-medium h-12 pl-6">Webpage Title</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12">URL</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12 text-right pr-6 w-32">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i} className="border-b border-slate-50">
                                                <TableCell className="pl-6 py-4">
                                                    <Skeleton className="h-5 w-50 rounded-md" />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Skeleton className="h-4 w-25 rounded-md" />
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Skeleton className="h-9 w-9 rounded-xl" />
                                                        <Skeleton className="h-9 w-9 rounded-xl" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : webpages.length > 0 ? (
                                        webpages.map((page) => (
                                            <TableRow key={page._id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                                <TableCell className="pl-6 py-4 align-middle">
                                                    <span className="font-semibold text-slate-800">{page.title}</span>
                                                </TableCell>
                                                <TableCell className="py-4 align-middle max-w-xs truncate">
                                                    <a 
                                                        href={page.url?.startsWith('http') ? page.url : `/page/${page.url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        {page.url}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-4 align-middle">
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            onClick={() => onEdit(page)} 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            onClick={() => onDelete(page._id)} 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <FileText className="w-8 h-8 mb-2 text-slate-300" />
                                                    <p>No custom webpages found</p>
                                                    <Button 
                                                        variant="link" 
                                                        onClick={() => {
                                                            if (formRef.current) {
                                                                formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }
                                                        }}
                                                        className="text-blue-600 p-0 h-auto mt-1"
                                                    >
                                                        Create your first one
                                                    </Button>
                                                </div>
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
    );
};

export default ManageWebpages;
