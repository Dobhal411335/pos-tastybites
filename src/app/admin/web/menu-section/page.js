'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2, FolderPlus, Layers, PackagePlus, Eye } from "lucide-react"
import React, { useEffect, useState } from "react"
import {toast} from "sonner"

const ManageMenuSection = () => {
    const [categories, setCategories] = useState([])
    const [editItem, setEditItem] = useState(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [editType, setEditType] = useState('')
    const [activeTab, setActiveTab] = useState('categories')
    const [selectedSubcategory, setSelectedSubcategory] = useState(null)

    // Form states
    const [categoryForm, setCategoryForm] = useState({ catTitle: '' })
    const [subCategoryForm, setSubCategoryForm] = useState({ categoryId: '', subCatTitle: '' })
    const [packageForm, setPackageForm] = useState({ subCategoryId: '', subCatPackageTitle: '', subCatPackageUrl: '' })

    // useEffect(() => {
    //     fetchCategories()
    // }, [section])

    const fetchCategories = async () => {
        try {
            const res = await fetch(`/api/web/subMenuFixed`)
            const data = await res.json()
            setCategories(data)
        } catch (error) {
            toast.error("Failed to fetch categories")
        }
    }

    const handleSubcategoryChange = (e) => {
        const subcategoryId = e.target.value
        setPackageForm({ ...packageForm, subCategoryId: subcategoryId })
        setSelectedSubcategory(subcategoryId)
    }

    const handleAddCategory = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch("/api/web/subMenuFixed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "category",
                    catTitle: categoryForm.catTitle
                }),
            })

            const responseData = await response.json()

            if (response.ok) {
                toast.success("Category added successfully!")
                setCategoryForm({ catTitle: '' })
                fetchCategories()
            } else {
                toast.error(responseData.message || "Failed to add category")
            }
        } catch (error) {
            console.error("Error:", error)
            toast.error("Something went wrong")
        }
    }

    const handleAddSubCategory = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch("/api/web/subMenuFixed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "subcategory",
                    categoryId: subCategoryForm.categoryId,
                    subCatTitle: subCategoryForm.subCatTitle
                }),
            })

            if (response.ok) {
                toast.success("Subcategory added successfully!")
                setSubCategoryForm({ categoryId: '', subCatTitle: '' })
                fetchCategories()
            } else {
                toast.error("Failed to add subcategory")
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    const handleAddPackage = async (e) => {
        e.preventDefault()
        try {
            const response = await fetch("/api/web/subMenuFixed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "package",
                    subCategoryId: packageForm.subCategoryId,
                    title: packageForm.subCatPackageTitle,
                    url: packageForm.subCatPackageUrl
                }),
            })

            if (response.ok) {
                toast.success("Package added successfully!")
                setPackageForm({ subCategoryId: '', subCatPackageTitle: '', subCatPackageUrl: '' })
                fetchCategories()
            } else {
                toast.error("Failed to add package")
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    const handleEdit = async (e) => {
        e.preventDefault()
        try {
            let endpoint = "/api/web/subMenuFixed"
            let body = {}

            const formData = new FormData(e.target)
            const title = formData.get('title')
            const url = formData.get('url')

            if (editType === 'category') {
                endpoint = `/api/web/subMenuFixed/${editItem._id}`
                body = { catTitle: title }
            } else if (editType === 'subcategory') {
                endpoint = `/api/web/subMenuFixed/subCategory/${editItem._id}`
                body = {
                    categoryId: editItem.parentId,
                    title: title
                }
            } else if (editType === 'package') {
                endpoint = `/api/web/subMenuFixed/package/${editItem._id}`
                body = {
                    subCategoryId: editItem.parentId,
                    title: title,
                    url: url
                }
            }

            const response = await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            if (response.ok) {
                toast.success("Item updated successfully!")
                setIsEditDialogOpen(false)
                fetchCategories()
            } else {
                toast.error("Failed to update item")
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    const handleDelete = async () => {
        try {
            let endpoint = "/api/web/subMenuFixed"
            const searchParams = new URLSearchParams()

            if (editType === 'category') {
                endpoint = `/api/web/subMenuFixed/${itemToDelete._id}`
            } else if (editType === 'subcategory') {
                searchParams.set('categoryId', itemToDelete.parentId)
                endpoint = `/api/web/subMenuFixed/subCategory/${itemToDelete._id}?${searchParams.toString()}`
            } else if (editType === 'package') {
                searchParams.set('subCategoryId', itemToDelete.parentId)
                endpoint = `/api/web/subMenuFixed/package/${itemToDelete._id}?${searchParams.toString()}`
            }

            const response = await fetch(endpoint, {
                method: "DELETE",
            })

            if (response.ok) {
                toast.success("Item deleted successfully!")
                setIsDeleteDialogOpen(false)
                fetchCategories()
            } else {
                toast.error("Failed to delete item")
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    const toggleActive = async (item, type, parentId = null) => {
        try {
            const response = await fetch(`/api/web/subMenuFixed/${item._id}/toggle-active`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, parentId, active: !item.active }),
            })

            if (!response.ok) {
                toast.error("Failed to update status")
            }
            await fetchCategories();
            window.dispatchEvent(new Event('menuItemsUpdated'));
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    const openEditDialog = (item, type, parentId = null) => {
        setEditItem({ ...item, parentId })
        setEditType(type)
        setIsEditDialogOpen(true)
    }

    const openDeleteDialog = (item, type, parentId = null) => {
        setItemToDelete({ ...item, parentId })
        setEditType(type)
        setIsDeleteDialogOpen(true)
    }

    const getPackagesForSelectedSubcategory = () => {
        if (!selectedSubcategory) return []

        for (const category of categories) {
            if (category.subCat) {
                for (const subcat of category.subCat) {
                    if (subcat._id === selectedSubcategory && subcat.subCatPackage) {
                        return subcat.subCatPackage.map(pkg => ({
                            ...pkg,
                            categoryTitle: category.catTitle,
                            subcategoryTitle: subcat.title
                        }))
                    }
                }
            }
        }
        return []
    }

    const selectedSubcategoryPackages = getPackagesForSelectedSubcategory()
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
                        Menu Sections
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">Manage menu categories, subcategories, and packages.</p>
                </div>
            </div>
            {/* Add Forms Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden flex flex-col">
                    <div className="border-b border-slate-50 bg-white/50 p-6 pb-4">
                        <div className="flex items-center gap-2">
                            <FolderPlus className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Add Category</h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Create a top-level menu category.</p>
                    </div>
                    <form onSubmit={handleAddCategory} className="flex flex-col flex-1 p-6">
                        <div className="space-y-4 flex-1">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Category Title <span className="text-red-500">*</span></Label>
                                <Input
                                    value={categoryForm.catTitle}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, catTitle: e.target.value })}
                                    placeholder="e.g., Starters"
                                    required
                                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50"
                                />
                            </div>
                        </div>
                        <div className="pt-6 mt-auto">
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 shadow-sm transition-all">Add Category</Button>
                        </div>
                    </form>
                </div>

                <div className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden flex flex-col">
                    <div className="border-b border-slate-50 bg-white/50 p-6 pb-4">
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Add SubCategory</h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Group items under a main category.</p>
                    </div>
                    <form onSubmit={handleAddSubCategory} className="flex flex-col flex-1 p-6">
                        <div className="space-y-4 flex-1">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Select Category <span className="text-red-500">*</span></Label>
                                <select
                                    value={subCategoryForm.categoryId}
                                    onChange={(e) => setSubCategoryForm({ ...subCategoryForm, categoryId: e.target.value })}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50/50 text-slate-700 text-sm transition-colors"
                                    required
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories && categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.catTitle}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">SubCategory Title <span className="text-red-500">*</span></Label>
                                <Input
                                    value={subCategoryForm.subCatTitle}
                                    onChange={(e) => setSubCategoryForm({ ...subCategoryForm, subCatTitle: e.target.value })}
                                    placeholder="e.g., Soups"
                                    required
                                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50"
                                />
                            </div>
                        </div>
                        <div className="pt-6 mt-auto">
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 shadow-sm transition-all">Add SubCategory</Button>
                        </div>
                    </form>
                </div>

                <div className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden flex flex-col">
                    <div className="border-b border-slate-50 bg-white/50 p-6 pb-4">
                        <div className="flex items-center gap-2">
                            <PackagePlus className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Add Package</h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Add items to a subcategory.</p>
                    </div>
                    <form onSubmit={handleAddPackage} className="flex flex-col flex-1 p-6">
                        <div className="space-y-4 flex-1">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Select SubCategory <span className="text-red-500">*</span></Label>
                                <select
                                    value={packageForm.subCategoryId}
                                    onChange={handleSubcategoryChange}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50/50 text-slate-700 text-sm transition-colors"
                                    required
                                >
                                    <option value="" disabled>Select a subcategory</option>
                                    {categories.map(cat => (
                                        cat.subCat?.map(sub => (
                                            <option key={sub._id} value={sub._id}>{cat.catTitle} - {sub.title}</option>
                                        ))
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Package Title <span className="text-red-500">*</span></Label>
                                <Input
                                    value={packageForm.subCatPackageTitle}
                                    onChange={(e) => setPackageForm({ ...packageForm, subCatPackageTitle: e.target.value })}
                                    placeholder="e.g., Basic Setup"
                                    required
                                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Package URL <span className="text-xs text-slate-400 font-normal ml-1">(Optional)</span></Label>
                                <Input
                                    value={packageForm.subCatPackageUrl}
                                    onChange={(e) => setPackageForm({ ...packageForm, subCatPackageUrl: e.target.value })}
                                    placeholder="e.g., https://example.com"
                                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50"
                                />
                            </div>
                        </div>
                        <div className="pt-6 mt-auto">
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 shadow-sm transition-all">Add Package</Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <Button
                    className={`${activeTab === 'categories' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white text-blue-600'}`}
                    variant={activeTab === 'categories' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('categories')}
                >
                    Categories
                </Button>
                <Button
                    className={`${activeTab === 'subcategories' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white text-blue-600'}`}
                    variant={activeTab === 'subcategories' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('subcategories')}
                >
                    Subcategories
                </Button>
                <Button
                    className={`${activeTab === 'packages' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white text-blue-600'}`}
                    variant={activeTab === 'packages' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('packages')}
                >
                    Packages
                </Button>
            </div>

            {/* Categories Table */}
            {activeTab === 'categories' && (
                <div className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden mt-8">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category._id}>
                                    <TableCell className="font-medium">{category.catTitle}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`switch-${category._id}`}
                                                checked={category.active}
                                                onCheckedChange={() => toggleActive(category, 'category', category._id,)}
                                                className={`rounded-full transition-colors ${category.active ? "bg-green-500" : "bg-red-500"}`}
                                            />
                                            <Label htmlFor={`switch-${category._id}`} className="text-black">
                                                {category.active ? "ON" : "OFF"}
                                            </Label>
                                        </div>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => openEditDialog(category, 'category')}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            onClick={() => openDeleteDialog(category, 'category')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Subcategories Table */}
            {activeTab === 'subcategories' && (
                <div className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden mt-8">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Subcategory Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                category.subCat?.map((subCategory) => (
                                    <TableRow key={`subcat-${subCategory._id}`}>
                                        <TableCell>{category.catTitle}</TableCell>
                                        <TableCell>{subCategory.title}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id={`switch-${subCategory._id}`}
                                                    checked={subCategory.active}
                                                    onCheckedChange={() => toggleActive(subCategory, 'subcategory', category._id)}
                                                    className={`rounded-full transition-colors ${subCategory.active ? "bg-green-500" : "bg-red-500"}`}
                                                />
                                                <Label htmlFor={`switch-${subCategory._id}`} className="text-black">
                                                    {subCategory.active ? "ON" : "OFF"}
                                                </Label>
                                            </div>
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => openEditDialog(subCategory, 'subcategory', category._id)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => openDeleteDialog(subCategory, 'subcategory', category._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Packages Table */}
            {activeTab === 'packages' && (
                <div className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden mt-8">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Subcategory</TableHead>
                                    <TableHead>Package Title</TableHead>
                                    <TableHead>URL</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedSubcategory ? (
                                    selectedSubcategoryPackages.length > 0 ? (
                                        selectedSubcategoryPackages.map((pkg) => (
                                            <TableRow key={`pkg-${pkg._id}`}>
                                                <TableCell>{pkg.categoryTitle}</TableCell>
                                                <TableCell>{pkg.subcategoryTitle}</TableCell>
                                                <TableCell>{pkg.title}</TableCell>
                                                <TableCell className="truncate max-w-xs">{pkg.url}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            id={`switch-${pkg._id}`}
                                                            checked={pkg.active}
                                                            onCheckedChange={() => toggleActive(pkg, 'package', selectedSubcategory)}
                                                            className={`rounded-full transition-colors ${pkg.active ? "bg-green-500" : "bg-red-500"}`}
                                                        />
                                                        <Label htmlFor={`switch-${pkg._id}`} className="text-black">
                                                            {pkg.active ? "ON" : "OFF"}
                                                        </Label>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="flex gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => openEditDialog(pkg, 'package', selectedSubcategory)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        onClick={() => openDeleteDialog(pkg, 'package', selectedSubcategory)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-4">
                                                No packages found for this subcategory
                                            </TableCell>
                                        </TableRow>
                                    )
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">
                                            Please select a subcategory to view packages
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4 p-4">
                        {selectedSubcategory ? (
                            selectedSubcategoryPackages.length > 0 ? (
                                selectedSubcategoryPackages.map((pkg) => (
                                    <div key={`mobile-pkg-${pkg._id}`} className="border rounded-lg p-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="font-medium">Category:</span>
                                                <span>{pkg.categoryTitle}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Subcategory:</span>
                                                <span>{pkg.subcategoryTitle}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Package:</span>
                                                <span>{pkg.title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">URL:</span>
                                                <span className="truncate max-w-45">{pkg.url}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Status:</span>
                                                <Switch
                                                    checked={pkg.active}
                                                    onCheckedChange={() => toggleActive(pkg, 'package', selectedSubcategory)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEditDialog(pkg, 'package', selectedSubcategory)}
                                            >
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => openDeleteDialog(pkg, 'package', selectedSubcategory)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4">
                                    No packages found for this subcategory
                                </div>
                            )
                        ) : (
                            <div className="text-center py-4">
                                Please select a subcategory to view packages
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit {editType}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div>
                            <Label>Title</Label>
                            <Input
                                name="title"
                                defaultValue={
                                    editType === 'category'
                                        ? editItem?.catTitle
                                        : editItem?.title
                                }
                                required
                            />
                        </div>
                        {(editType === 'package') && (
                            <div>
                                <Label>URL</Label>
                                <Input
                                    name="url"
                                    defaultValue={editItem?.url}
                                    required
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to delete this {editType}? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ManageMenuSection