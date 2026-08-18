"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash, Edit, Loader2, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";
import { Badge } from "@/components/ui/badge";
import DeleteDialog from "@/components/common/DeleteDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export default function ShortDirectProductsPage() {
  const [heads, setHeads] = useState([]);
  const [productHeads, setProductHeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedHeadId, setSelectedHeadId] = useState("");
  const [formSections, setFormSections] = useState([]);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Modal State
  const [isAddHeadOpen, setIsAddHeadOpen] = useState(false);
  const [newHeadName, setNewHeadName] = useState("");
  const [isHeadSubmitting, setIsHeadSubmitting] = useState(false);

  // View Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewHeadId, setViewHeadId] = useState("");

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [headToDelete, setHeadToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [headsRes, productHeadsRes, catsRes, prodsRes] = await Promise.all([
        fetch("/api/menu/heads").then(res => res.json()),
        fetch("/api/menu/product-heads").then(res => res.json()),
        fetch("/api/menu/categories").then(res => res.json()),
        fetch("/api/menu/products").then(res => res.json())
      ]);

      if (headsRes.success) setHeads(headsRes.data);
      if (productHeadsRes.success) setProductHeads(productHeadsRes.data);
      if (catsRes.success) setCategories(catsRes.data);
      if (prodsRes.success) setAllProducts(prodsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHead = async (e) => {
    e.preventDefault();
    if (!newHeadName.trim()) return toast.error("Head name is required.");
    try {
      setIsHeadSubmitting(true);
      const res = await fetch("/api/menu/heads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHeadName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Head created successfully!");
        
        setHeads(prev => {
          const exists = prev.find(h => h._id === json.data._id);
          return exists ? prev : [...prev, json.data];
        });

        handleSelectHead(json.data._id);
        setIsAddHeadOpen(false);
        setNewHeadName("");
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to create head.");
    } finally {
      setIsHeadSubmitting(false);
    }
  };

  const handleSelectHead = (headId) => {
    setSelectedHeadId(headId);
    const existingMapping = productHeads.find(ph => (ph.head?._id || ph.head) === headId);
    if (existingMapping) {
      const mappedSections = existingMapping.categories.map((c, idx) => ({
        id: Date.now().toString() + idx,
        categoryId: c.category._id || c.category,
        productIds: c.products || []
      }));
      setFormSections(mappedSections);
    } else {
      setFormSections([]);
    }
  };

  const handleAddSection = () => {
    setFormSections([...formSections, { id: Date.now().toString(), categoryId: "", productIds: [] }]);
  };

  const handleRemoveSection = (id) => {
    setFormSections(formSections.filter(sec => sec.id !== id));
  };

  const handleCategoryChange = (sectionId, categoryId) => {
    setFormSections(formSections.map(sec => 
      sec.id === sectionId ? { ...sec, categoryId, productIds: [] } : sec
    ));
  };

  const handleProductToggle = (sectionId, productId, checked) => {
    setFormSections(formSections.map(sec => {
      if (sec.id === sectionId) {
        const newProductIds = checked 
          ? [...sec.productIds, productId] 
          : sec.productIds.filter(id => id !== productId);
        return { ...sec, productIds: newProductIds };
      }
      return sec;
    }));
  };

  const handleSaveForm = async () => {
    if (!selectedHeadId) return toast.error("Please select a Head first.");
    
    // Construct the payload mapping
    const categoriesPayload = formSections
      .filter(sec => sec.categoryId) // Ensure category is selected
      .map(sec => ({
        category: sec.categoryId,
        products: sec.productIds
      }));

    try {
      setIsFormSubmitting(true);
      const res = await fetch("/api/menu/product-heads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headId: selectedHeadId, categories: categoriesPayload })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Configuration saved successfully!");
        fetchData(); // Refresh table data
        // Clear form
        setSelectedHeadId("");
        setFormSections([]);
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to save configuration.");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleEditHead = (head) => {
    handleSelectHead(head._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!headToDelete) return;
    try {
      // Delete the Head (this could also cascade to productHeads, but we just delete the Head for now)
      const res = await fetch(`/api/menu/heads?id=${headToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Head deleted successfully.");
        if (selectedHeadId === headToDelete) {
          setSelectedHeadId("");
          setFormSections([]);
        }
        fetchData();
      } else {
        toast.error(json.message);
      }
    } catch (error) {
      toast.error("Failed to delete head.");
    } finally {
      setIsDeleteDialogOpen(false);
      setHeadToDelete(null);
    }
  };

  const handleToggleStatus = async (head) => {
    const newStatus = head.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/menu/heads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: head._id, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setHeads(heads.map(h => h._id === head._id ? { ...h, status: newStatus } : h));
      } else {
        toast.error(json.message);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const activeViewMapping = productHeads.find(ph => (ph.head?._id || ph.head) === viewHeadId);
  const activeViewHead = heads.find(h => h._id === viewHeadId);

  return (
    <div className="flex flex-col p-8 bg-zinc-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8 w-full">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-bold leading-tight" style={{ color: PALETTE.ink }}>Short Direct Products</h1>
          <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>Configure menu heads, categories, and specific products.</p>
        </div>

        {/* Form Card */}
        <Card className="px-2">
          <CardHeader>
            <CardTitle className="text-xl">Configuration Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1: Head Selection */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold">Select Head <span className="text-red-500">*</span></label>
                <Select value={selectedHeadId} onValueChange={handleSelectHead}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose a head..." />
                  </SelectTrigger>
                  <SelectContent>
                    {heads.map(h => (
                      <SelectItem key={h._id} value={h._id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isAddHeadOpen} onOpenChange={setIsAddHeadOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 px-4" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                    <Plus className="w-4 h-4 mr-2" /> Add New Head
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateHead}>
                    <DialogHeader>
                      <DialogTitle>Add New Head</DialogTitle>
                      <DialogDescription>Create a new head grouping to assign categories and products.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Head Name</label>
                        <Input 
                          placeholder="e.g. Lunch Specials" 
                          value={newHeadName} 
                          onChange={(e) => setNewHeadName(e.target.value)} 
                          autoFocus 
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddHeadOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isHeadSubmitting} style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                        {isHeadSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Head
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            

            <hr className="border-zinc-200" />

            {/* Section 2: Categories and Products */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Categories & Products</h3>
                <Button variant="outline" onClick={handleAddSection} className="h-9">
                  <Plus className="w-4 h-4 mr-2" /> Add Category
                </Button>
              </div>

              {formSections.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                  No categories added yet. Click "Add Category" to start.
                </div>
              ) : (
                <div className="space-y-6">
                  {formSections.map((section, index) => {
                    const categoryProducts = allProducts.filter(p => 
                      (p.category?._id || p.category) === section.categoryId
                    );

                    return (
                      <div key={section.id} className="p-5 border border-zinc-200 rounded-xl bg-white shadow-sm space-y-4 relative">
                        <div className="absolute top-4 right-4">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(section.id)} className="text-red-500 hover:bg-red-50">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="w-3/4 space-y-2">
                          <label className="text-sm font-semibold">Menu Category {index + 1}</label>
                          <Select value={section.categoryId} onValueChange={(val) => handleCategoryChange(section.id, val)}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select a category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(c => (
                                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {section.categoryId && (
                          <div className="space-y-3 pt-2">
                            <label className="text-sm font-semibold text-zinc-700">Select Products</label>
                            {categoryProducts.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {categoryProducts.map(prod => (
                                  <label 
                                    key={prod._id} 
                                    htmlFor={`prod-${section.id}-${prod._id}`}
                                    className="flex items-center space-x-2 bg-zinc-50 p-2 rounded-md border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors"
                                  >
                                    <Checkbox 
                                      id={`prod-${section.id}-${prod._id}`} 
                                      checked={section.productIds.includes(prod._id)}
                                      onCheckedChange={(checked) => handleProductToggle(section.id, prod._id, checked)}
                                    />
                                    <span className="text-sm font-medium leading-none flex-1 truncate">
                                      {prod.name}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500 italic">No products found in this category.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-zinc-50 border-t border-zinc-200 py-4 flex justify-end gap-3">
            {selectedHeadId && (
              <Button 
                variant="outline" 
                onClick={() => { setSelectedHeadId(""); setFormSections([]); }}
              >
                Cancel Edit
              </Button>
            )}
            <Button 
              onClick={handleSaveForm} 
              disabled={isFormSubmitting || !selectedHeadId || formSections.length === 0}
              className="px-8" 
              style={{ backgroundColor: PALETTE.accent, color: "white" }}
            >
              {isFormSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Configuration
            </Button>
          </CardFooter>
        </Card>

        {/* Saved Data Table */}
        <Card className="px-2">
          <CardHeader>
            <CardTitle className="text-xl">Saved Heads</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="w-[30%]">Head Name</TableHead>
                <TableHead className="w-[20%]">Categories</TableHead>
                <TableHead className="w-[20%]">Total Products</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : heads.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-500">No heads found.</TableCell></TableRow>
              ) : (
                heads.map(head => {
                  const mapping = productHeads.find(ph => (ph.head?._id || ph.head) === head._id);
                  const totalCategories = mapping?.categories?.length || 0;
                  const totalProducts = mapping?.categories?.reduce((sum, cat) => sum + (cat.products?.length || 0), 0) || 0;
                  
                  return (
                    <TableRow key={head._id}>
                      <TableCell className="font-medium text-zinc-900">{head.name}</TableCell>
                      <TableCell className="text-zinc-600">{totalCategories} categories</TableCell>
                      <TableCell className="text-zinc-600">{totalProducts} products</TableCell>
                      <TableCell>
                        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => handleToggleStatus(head)}>
                          {head.status === "Active" ? (
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
                              <Button size="icon" className="h-8 w-8 text-zinc-800 hover:text-zinc-900 border cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white">
                              <DropdownMenuItem 
                                className="text-[14px] font-medium cursor-pointer flex items-center" 
                                onClick={() => {
                                  setTimeout(() => {
                                    setViewHeadId(head._id);
                                    setIsViewModalOpen(true);
                                  }, 150);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-[14px] font-medium cursor-pointer flex items-center" 
                                onClick={() => { 
                                  setTimeout(() => {
                                    handleEditHead(head);
                                  }, 150);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Head
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer flex items-center"
                                onClick={() => { 
                                  setTimeout(() => {
                                    setHeadToDelete(head._id);
                                    setIsDeleteDialogOpen(true);
                                  }, 150);
                                }}
                              >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Head Details: {activeViewHead?.name}</DialogTitle>
            <DialogDescription>
              View the configuration of categories and products for this head.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {!activeViewMapping || activeViewMapping.categories?.length === 0 ? (
              <p className="text-zinc-500 italic text-center py-4">No categories configured for this head.</p>
            ) : (
              activeViewMapping.categories.map((c, idx) => {
                const catName = c.category?.name || "Unknown Category";
                const catProducts = c.products || [];
                return (
                  <div key={idx} className="space-y-3">
                    <h3 className="font-semibold text-zinc-800 border-b pb-2">{catName}</h3>
                    {catProducts.length === 0 ? (
                      <p className="text-sm text-zinc-500">No products selected.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {catProducts.map((prodId, pIdx) => {
                          const prodObj = allProducts.find(p => p._id === prodId);
                          return (
                            <Badge key={pIdx} variant="secondary" className="bg-zinc-100 text-zinc-700 border-zinc-200 font-normal">
                              {prodObj ? prodObj.name : "Unknown Product"}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Head"
        description="Are you sure you want to delete this head? This action cannot be undone."
      />
    </div>
  );
}
