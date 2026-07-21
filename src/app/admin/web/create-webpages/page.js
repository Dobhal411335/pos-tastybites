'use client'

import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Loader2, Pencil, Trash2, QrCode, Copy, FileText, Settings, X, Plus } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const TEMPLATE_OPTIONS = [
    { value: "design1", label: "Design 1" },
    { value: "design2", label: "Design 2" },
    { value: "design3", label: "Design 3" },
    { value: "design4", label: "Design 4" },
    { value: "design5", label: "Design 5" },
    { value: "design6", label: "Design 6" },
    { value: "design7", label: "Design 7" },
];

const getTemplateLabel = (templateType) => {
    const match = TEMPLATE_OPTIONS.find((option) => option.value === templateType);
    return match ? match.label : "Design 1";
};

const CreateWebpages = () => {
    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Scroll ref for form
    const formRef = useRef(null);

    // Handler to fill form for editing
    const handleEditProduct = (activity) => {
        reset({
            title: activity.title || '',
            active: typeof activity.active === 'boolean' ? activity.active : true,
            templateType: activity.templateType || 'design1',
        });
        setActive(typeof activity.active === 'boolean' ? activity.active : true);
        setTitle(activity.title || '');
        setTemplateType(activity.templateType || 'design1');
        setEditId(activity._id);
        setIsEditing(true);
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Cancel edit handler
    const handleCancelEdit = () => {
        reset({
            title: '',
            active: true,
            templateType: 'design1',
        });
        setActive(true);
        setTitle('');
        setSlug('');
        setTemplateType('design1');
        setEditId(null);
        setIsEditing(false);
    };

    // Slugify utility (copied from ProductProfile)
    function slugify(str) {
        return str
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with dash
            .replace(/^-+|-+$/g, '');  // Remove leading/trailing dashes
    }

    // Copy to clipboard helper
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        toast.success('URL copied!', { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
    }

    // Toggle product active status
    const toggleSwitch = async (productId, currentActive, isDirect) => {
        if (isDirect) {
            toast.error('Only non-direct products can be toggled.', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            return;
        }
        try {
            const response = await fetch('/api/web/create_webpage', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: productId, active: !currentActive }),
            });
            const result = await response.json();
            if (response.ok) {
                setActivities(prev => prev.map(prod => prod._id === productId ? { ...prod, active: !currentActive } : prod));
                toast.success(`WebPage is now ${!currentActive ? 'active' : 'inactive'}`, { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
            } else {
                toast.error(result.message || 'Failed to update WebPage status.', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (error) {
            toast.error('Failed to update WebPage status.', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        }
    }

    const { handleSubmit, register, setValue, reset, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [activities, setActivities] = useState([]);
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [active, setActive] = useState(true);
    const [templateType, setTemplateType] = useState("design1");

    useEffect(() => {
        // Fetch products for this submenu/category or all direct products
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Always fetch all activities from the new API
                const response = await fetch(`/api/web/create_webpage`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setActivities(data);
                } else {
                    setActivities([]);
                }
            } catch (error) {
                setActivities([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const deletePackage = async (id) => {
        if (!confirm("Are you sure you want to delete this webpage?")) return;
        setDeletingId(id);
        try {
            const response = await fetch('/api/web/create_webpage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const result = await response.json();
            if (response.ok) {
                setActivities((prev) => prev.filter((prod) => prod._id !== id));
                toast.success('WebPage deleted successfully!', { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
            } else {
                toast.error(result.message || 'Failed to delete WebPage.', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            }
        } catch (error) {
            toast.error('Failed to delete WebPage.', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        } finally {
            setDeletingId(null);
        }
    };

    const onSubmit = async () => {
        if (!title.trim()) {
            toast.error("Title is required", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
            return;
        }

        setIsLoading(true);
        const slug = slugify(title);
        try {
            const payload = {
                title,
                slug,
                active: typeof active === 'boolean' ? active : true,
                templateType,
            };
            let response, res;
            if (isEditing && editId) {
                response = await fetch('/api/web/create_webpage', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editId, ...payload })
                });
                res = await response.json();
                if (response.ok) {
                    toast.success("WebPage updated successfully!", { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
                    setActivities(prev => prev.map(a => a._id === editId ? { ...a, ...payload } : a));
                    handleCancelEdit();
                } else {
                    toast.error(res.error || "Failed to update WebPage", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
                }
            } else {
                response = await fetch('/api/web/create_webpage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                res = await response.json();
                if (response.ok) {
                    toast.success("Page added successfully!", { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
                    setActivities(prev => [
                        ...prev,
                        {
                            _id: res._id,
                            title: res.title,
                            active: res.active,
                            slug: res.slug,
                            templateType: res.templateType || templateType,
                        }
                    ]);
                    reset();
                    setTitle("");
                    setTemplateType("design1");
                } else {
                    toast.error("Failed to add WebPage", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
                }
            }
        } catch (error) {
            toast.error("Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
        } finally {
            setIsLoading(false);
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
                        Manage Subpages
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">Create and manage content pages like activities, packages, and sections.</p>
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
                                    {isEditing ? "Edit Webpage" : "Add New Webpage"}
                                </CardTitle>
                            </div>
                            {isEditing && (
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
                            {isEditing ? "Update the details of the selected webpage." : "Create a new webpage with a selected template."}
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="productTitle" className="text-slate-700 font-medium">WebPage Title <span className="text-red-500">*</span></Label>
                                    <Input
                                        name="productTitle"
                                        placeholder="Enter Page Title..."
                                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-slate-700 font-medium">Frontend Design</Label>
                                    <Select value={templateType} onValueChange={setTemplateType}>
                                        <SelectTrigger className="w-full h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:ring-blue-500">
                                            <SelectValue placeholder="Select Design" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {TEMPLATE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50/80 border-t border-slate-100 p-6 flex justify-end">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8 shadow-sm transition-all"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {isEditing ? "Update WebPage" : <><Plus className="w-4 h-4 mr-2" /> Add WebPage</>}
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
                            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full ml-2">
                                {activities.length} Total
                            </span>
                        </div>
                        <CardDescription className="text-slate-500 mt-1">Manage all created webpages and their statuses.</CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                                    <TableRow className="hover:bg-transparent border-0">
                                        <TableHead className="text-slate-500 font-medium h-12 pl-6 w-16">S.No</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12">WebPage Title</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12">Design</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12 text-center w-24">URL</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12 text-right pr-6 w-56">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i} className="border-b border-slate-50">
                                                <TableCell className="pl-6 py-4"><Skeleton className="h-4 w-4" /></TableCell>
                                                <TableCell className="py-4"><Skeleton className="h-5 w-50 rounded-md" /></TableCell>
                                                <TableCell className="py-4"><Skeleton className="h-5 w-25 rounded-md" /></TableCell>
                                                <TableCell className="py-4 text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                                <TableCell className="text-right pr-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Skeleton className="h-9 w-9 rounded-xl" />
                                                        <Skeleton className="h-9 w-9 rounded-xl" />
                                                        <Skeleton className="h-9 w-14 rounded-xl" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : activities && activities.length > 0 ? (
                                        activities.map((activity, index) => {
                                            const url = typeof window !== 'undefined' ? `${window.location.origin}/${activity.slug}` : '';
                                            return (
                                                <TableRow key={activity._id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                                    <TableCell className="pl-6 py-4 text-slate-500">{index + 1}</TableCell>
                                                    <TableCell className="py-4 font-semibold text-slate-800">{activity.title}</TableCell>
                                                    <TableCell className="py-4 text-slate-600">
                                                        <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200">
                                                            {getTemplateLabel(activity.templateType)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => copyToClipboard(url)}
                                                            disabled={!url}
                                                            title="Copy WebPage URL"
                                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="flex items-center gap-2 mr-2">
                                                                <Switch
                                                                    id={`switch-${activity._id}`}
                                                                    checked={activity.active}
                                                                    onCheckedChange={() => toggleSwitch(activity._id, activity.active, activity.isDirect)}
                                                                    disabled={activity.isDirect}
                                                                    className={`data-[state=checked]:bg-green-500`}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    asChild
                                                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                                                    title="Manage Content"
                                                                >
                                                                    <Link href={`/admin/web/edit_webpages/${activity._id}`}>
                                                                        <FileText className="w-4 h-4" />
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleEditProduct(activity)}
                                                                    title="Edit Page Properties"
                                                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    disabled={deletingId === activity._id}
                                                                    onClick={() => deletePackage(activity._id)}
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                                    title="Delete Webpage"
                                                                >
                                                                    {deletingId === activity._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan="5" className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <FileText className="w-8 h-8 mb-2 text-slate-300" />
                                                    <p>No webpages available.</p>
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
    )

}
export default CreateWebpages
