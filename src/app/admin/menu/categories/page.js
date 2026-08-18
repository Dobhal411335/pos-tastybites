"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutGrid,
  Edit,
  Trash,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor"
import DeleteDialog from "@/components/common/DeleteDialog";
import { Loader2 } from "lucide-react";
import AddonChoiceOptionsEditor, {
  normalizeAddonChoiceOptionsForForm,
  serializeAddonChoiceOptions,
} from "@/components/menu/AddonChoiceOptionsEditor";

export default function MenuCategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryAddons, setCategoryAddons] = useState([]);
  const [addonsList, setAddonsList] = useState([]);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [newAddonName, setNewAddonName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/menu/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (e) {
      toast.error("Failed to fetch categories.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonsList = async () => {
    try {
      const res = await fetch("/api/menu/addons");
      const json = await res.json();
      if (json.success) setAddonsList(json.data.map((a) => a.name));
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchCategories();
    fetchAddonsList();
  }, []);

  const handleOpenAdd = () => {
    setEditCategoryId(null);
    setNewCategoryName("");
    setCategoryAddons([]);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditCategoryId(cat._id);
    setNewCategoryName(cat.name);
    setCategoryAddons(
      Array.isArray(cat.addons) && cat.addons.length
        ? cat.addons.map((a) => ({
            name: a.name || "",
            price: a.price ?? "",
            size: a.size || "Regular",
            status: a.status !== false,
            choiceOptions: normalizeAddonChoiceOptionsForForm(a.choiceOptions),
          }))
        : []
    );
    setIsAddDialogOpen(true);
  };

  const handleAddAddonSubmit = async (e) => {
    e.preventDefault();
    if (!newAddonName.trim()) {
      toast.error("Please enter a valid name.");
      return;
    }
    try {
      const res = await fetch("/api/menu/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAddonName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Addon configured!");
        setNewAddonName("");
        setIsAddonModalOpen(false);
        fetchAddonsList();
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Failed to create addon");
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      return toast.error("Please enter a category name.");
    }
    try {
      setIsSubmitting(true);
      const url = "/api/menu/categories";
      const method = editCategoryId ? "PUT" : "POST";
      const addonsPayload = categoryAddons
        .filter((a) => a.name)
        .map((a) => ({
          ...a,
          price: parseFloat(a.price) || 0,
          choiceOptions: serializeAddonChoiceOptions(a.choiceOptions),
        }));
      const payload = editCategoryId
        ? { _id: editCategoryId, name: newCategoryName.trim(), addons: addonsPayload }
        : { name: newCategoryName.trim(), addons: addonsPayload };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Category ${editCategoryId ? "updated" : "created"} successfully!`);
        setIsAddDialogOpen(false);
        fetchCategories();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/menu/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: cat._id, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setCategories(categories.map(c => c._id === cat._id ? { ...c, status: newStatus } : c));
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDeletePrompt = (id) => {
    setCategoryToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetch(`/api/menu/categories?id=${categoryToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Category deleted successfully.");
        fetchCategories();
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to delete category");
    } finally {
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col" style={{ backgroundColor: PALETTE.canvas, color: PALETTE.ink }}>
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1800px] mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>
                  Menu Categories
                </h1>
                <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
                  Manage the sections of your menu where products are assigned.
                </p>
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenAdd} className="h-10 px-4 font-semibold text-[15px] gap-2 transition-transform hover:scale-[1.02]" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                    <Plus className="w-5 h-5" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleSaveCategory}>
                    <DialogHeader>
                      <DialogTitle className="text-[22px] font-bold">{editCategoryId ? "Edit Category" : "Add Category"}</DialogTitle>
                      <DialogDescription className="text-[15px]">
                        {editCategoryId ? "Modify this category's properties and default addons." : "Create a new category and optionally attach default addons."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold" style={{ color: PALETTE.ink }}>
                          Category Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          autoFocus
                          placeholder="e.g. Signature Burgers"
                          className="h-11 text-[16px]"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4 pt-6 border-t border-zinc-100">
                        <label className="text-[14px] font-semibold text-zinc-900 block">
                          Link Addons
                        </label>
                        {categoryAddons.map((addon, index) => (
                          <div key={index} className="border border-zinc-100 p-4 rounded-md bg-zinc-50/50 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="space-y-2">
                              <label className="text-[13px] font-semibold text-zinc-900">Price Amount ($)</label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={addon.price || ""}
                                onChange={(e) => {
                                  const next = [...categoryAddons];
                                  next[index].price = e.target.value;
                                  setCategoryAddons(next);
                                }}
                                className="h-11 text-[16px] bg-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[13px] font-semibold text-zinc-900">Addon Selection</label>
                              <div className="flex gap-2">
                                <Select
                                  value={addon.name || ""}
                                  onValueChange={(val) => {
                                    const next = [...categoryAddons];
                                    next[index].name = val;
                                    setCategoryAddons(next);
                                  }}
                                >
                                  <SelectTrigger className="h-11 text-[16px] bg-white flex-1">
                                    <SelectValue placeholder="Select Addon" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                                    {addonsList.map((ad, idx) => (
                                      <SelectItem key={idx} value={ad}>{ad}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  onClick={() => setIsAddonModalOpen(true)}
                                  variant="outline"
                                  className="h-11 w-11 p-0 shrink-0 text-zinc-600 hover:text-zinc-900 border-zinc-200"
                                >
                                  <Plus className="h-5 w-5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setCategoryAddons(categoryAddons.filter((_, i) => i !== index))}
                                  className="h-11 w-11 p-0 shrink-0 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                            </div>
                            <AddonChoiceOptionsEditor
                              choiceOptions={addon.choiceOptions || []}
                              onChange={(choiceOptions) => {
                                const next = [...categoryAddons];
                                next[index] = { ...next[index], choiceOptions };
                                setCategoryAddons(next);
                              }}
                            />
                          </div>
                        ))}
                        <div className="flex justify-end mt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-9"
                            onClick={() => setCategoryAddons([...categoryAddons, { name: addonsList[0] || "", price: "", size: "Regular", status: true, choiceOptions: normalizeAddonChoiceOptionsForForm([]) }])}
                          >
                            Add More Addons
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting} className="h-11 hover:bg-red-600 hover:text-white px-6 font-semibold cursor-pointer border-zinc-200">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="h-11 px-6 font-semibold cursor-pointer" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {editCategoryId ? (isSubmitting ? "Saving..." : "Save Changes") : (isSubmitting ? "Saving..." : "Save Category")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Table Card */}
            <Card className="bg-white border-0 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${PALETTE.border}` }}>

              {/* Toolbar */}
              <CardHeader className="px-6 py-5 border-b" style={{ borderColor: PALETTE.border, paddingBottom: "1.25rem" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Search categories..."
                      className="h-10 pl-9 bg-zinc-50 border-zinc-200 text-[14px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Table */}
              <Table>
                <TableHeader className="bg-zinc-50 sticky top-0 z-10 border-b border-zinc-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[45%] text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      S.No
                    </TableHead>
                    <TableHead className="w-[30%] text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Category Name <ArrowUpDown className="inline w-3 h-3 ml-1" />
                    </TableHead>
                    <TableHead className="w-[20%] text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Products
                    </TableHead>
                    <TableHead className="w-[15%] text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Addons
                    </TableHead>
                    <TableHead className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-[12px] font-bold uppercase tracking-wider text-zinc-500 py-4 px-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index} className="h-16 border-b border-zinc-100">
                        <TableCell className="px-6">
                          <div className="h-4 w-6 bg-zinc-200 rounded animate-pulse" />
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="h-4 w-48 bg-zinc-200 rounded animate-pulse" />
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse" />
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="h-4 w-12 bg-zinc-200 rounded animate-pulse" />
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="h-6 w-16 bg-zinc-200 rounded-full animate-pulse" />
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <div className="flex justify-end">
                            <div className="h-8 w-8 bg-zinc-200 rounded animate-pulse" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredCategories.length > 0 ? (
                    filteredCategories.map((cat, index) => (
                      <TableRow key={cat._id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6 font-semibold text-[15px] text-zinc-900">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-6 font-semibold text-[15px] text-zinc-900">
                          {cat.name}
                        </TableCell>
                        <TableCell className="px-6 font-medium text-[14px] text-zinc-500">
                          {cat.items || 0} products
                        </TableCell>
                        <TableCell className="px-6 font-medium text-[14px] text-zinc-500">
                          {cat.addons?.length || 0}
                        </TableCell>
                        <TableCell className="px-6">
                          <Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleToggleStatus(cat)}>
                            {cat.status === "Active" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[13px] font-semibold transition-colors cursor-pointer">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 px-2.5 py-1 text-[13px] font-semibold transition-colors cursor-pointer">
                                Inactive
                              </Badge>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 border cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white">
                              <DropdownMenuItem className="text-[14px] font-medium cursor-pointer" onClick={() => { setTimeout(() => handleOpenEdit(cat), 150) }}>
                                <Edit />  Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => { setTimeout(() => handleDeletePrompt(cat._id), 150) }}
                              >
                                <Trash />  Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-zinc-500 text-[15px]">
                        No categories found matching &quot;{searchQuery}&quot;
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <CardFooter className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <span className="text-[14px] text-zinc-500 font-medium">
                  Showing {filteredCategories.length} of {categories.length} categories
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 text-zinc-400" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-zinc-400" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>

          </div>
        </main>
      </div>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category? Products assigned to it must be removed first."
      />

      <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={handleAddAddonSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[22px] font-bold text-zinc-900">Create Addon</DialogTitle>
              <DialogDescription className="text-[15px]">
                Configure a new supplementary product addon.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <label className="text-[14px] font-semibold text-zinc-900">
                Addon Name <span className="text-red-500">*</span>
              </label>
              <Input
                autoFocus
                required
                placeholder="e.g. Extra Bacon Strips"
                className="h-11 text-[16px]"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddonModalOpen(false)} className="h-11 px-6 font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="h-11 px-6 font-semibold cursor-pointer text-white" style={{ backgroundColor: PALETTE.accent }}>
                Save Addon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
