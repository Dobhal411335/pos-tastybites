"use client";

import { useEffect, useState } from "react";
import {toast} from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Plus, Trash2, LayoutTemplate, ListTree, RefreshCcw } from "lucide-react";
import DeleteDialog from "@/components/common/DeleteDialog";

const createSubSection = () => ({
  title: "",
  url: "",
  order: "",
  active: true,
});

const createFormState = () => ({
  title: "",
  url: "#",
  order: "",
  active: true,
  subSections: [createSubSection()],
});

const normalizeFormData = (formState, fallbackOrder = 1) => ({
  title: formState.title.trim(),
  url: formState.url?.trim() || "#",
  order: formState.order === "" ? fallbackOrder : Number(formState.order),
  active: formState.active,
  subSections: formState.subSections
    .filter((item) => item.title.trim())
    .map((item, index) => ({
      title: item.title.trim(),
      url: item.url?.trim() || "#",
      order: item.order === "" ? index + 1 : Number(item.order),
      active: item.active,
    })),
});

const NavbarSection = () => {
  const [sections, setSections] = useState([]);
  const [formState, setFormState] = useState(createFormState());
  const [editingId, setEditingId] = useState(null);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/web/navbar-sections");
      const data = await response.json();
      setSections(Array.isArray(data) ? data : []);
    } catch (error) {
      setSections([]);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const resetForm = () => {
    setFormState(createFormState());
    setEditingId(null);
  };

  const handleSubSectionChange = (index, key, value) => {
    setFormState((previous) => ({
      ...previous,
      subSections: previous.subSections.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addSubSection = () => {
    setFormState((previous) => ({
      ...previous,
      subSections: [...previous.subSections, createSubSection()],
    }));
  };

  const removeSubSection = (index) => {
    setFormState((previous) => ({
      ...previous,
      subSections: previous.subSections.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.title.trim()) {
      toast.error("Navbar section title is required", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
      return;
    }

    const payload = normalizeFormData(formState, sections.length + 1);
    setSubmitting(true);

    try {
      const response = await fetch("/api/web/navbar-sections", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save navbar section");
      }

      toast.success(editingId ? "Navbar section updated" : "Navbar section created", { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
      resetForm();
      await fetchSections();
      window.dispatchEvent(new Event("navbarSectionsUpdated"));
    } catch (error) {
      toast.error(error.message || "Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (section) => {
    setEditingId(section._id);
    setFormState({
      title: section.title || "",
      url: section.url || "#",
      order: section.order ?? "",
      active: section.active ?? true,
      subSections: Array.isArray(section.subSections) && section.subSections.length
        ? section.subSections.map((item) => ({
            title: item.title || "",
            url: item.url || "#",
            order: item.order ?? "",
            active: item.active ?? true,
          }))
        : [createSubSection()],
    });
    // Scroll to top to see the form when editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id) => {
    setSectionToDelete(id);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;
    try {
      const response = await fetch("/api/web/navbar-sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sectionToDelete }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete navbar section");
      }

      toast.success("Navbar section deleted", { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } });
      await fetchSections();
      window.dispatchEvent(new Event("navbarSectionsUpdated"));
    } catch (error) {
      toast.error(error.message || "Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
    } finally {
      setSectionToDelete(null);
    }
  };

  const toggleActive = async (section) => {
    try {
      const response = await fetch("/api/web/navbar-sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section._id, active: !section.active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update navbar section status");
      }

      await fetchSections();
      window.dispatchEvent(new Event("navbarSectionsUpdated"));
    } catch (error) {
      toast.error(error.message || "Something went wrong", { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } });
    }
  };

  const sortedSections = [...sections].sort((left, right) => (left.order || 0) - (right.order || 0));

  return (
    <div className="w-full max-w-350 mx-auto space-y-8 p-6 font-sans pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Navigation Menu</h1>
          <p className="text-sm text-slate-500 mt-1">Create top-level links and nested sub-sections for the header.</p>
        </div>
        {editingId && (
          <Button type="button" variant="outline" onClick={resetForm} className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel Editing
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Form Column */}
        <div className="xl:col-span-5 space-y-6 sticky top-6">
          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-slate-400" />
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {editingId ? "Edit Navbar Section" : "Add New Section"}
                </CardTitle>
              </div>
              <CardDescription className="text-slate-500">Configure the main navigation link details.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-sm font-medium text-slate-600 ml-1">Section Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={formState.title}
                    onChange={(event) => setFormState((previous) => ({ ...previous, title: event.target.value }))}
                    placeholder="e.g. About Us"
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="url" className="text-sm font-medium text-slate-600 ml-1">Section URL</Label>
                    <Input
                      id="url"
                      value={formState.url}
                      onChange={(event) => setFormState((previous) => ({ ...previous, url: event.target.value }))}
                      placeholder="/about-us"
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="order" className="text-sm font-medium text-slate-600 ml-1">Display Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formState.order}
                      onChange={(event) => setFormState((previous) => ({ ...previous, order: event.target.value }))}
                      placeholder="1"
                      className="h-11 rounded-2xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Visibility Status</Label>
                    <p className="text-xs text-slate-500 mt-1">Hide this section without deleting it.</p>
                  </div>
                  <Switch
                    checked={formState.active}
                    onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, active: checked }))}
                  />
                </div>

                {/* Sub Sections */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Nested Dropdowns</h3>
                      <p className="text-xs text-slate-500 mt-1">Add sub-links under this section.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addSubSection} className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      <Plus className="size-4" /> Add Link
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {formState.subSections.map((subSection, index) => (
                      <div key={index} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md relative group">
                        <div className="absolute right-4 top-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                            onClick={() => removeSubSection(index)}
                            disabled={formState.subSections.length === 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2 mt-2">
                          <div className="grid gap-2 sm:col-span-2 pr-8">
                            <Label className="text-xs font-medium text-slate-600">Link Title</Label>
                            <Input
                              value={subSection.title}
                              onChange={(event) => handleSubSectionChange(index, "title", event.target.value)}
                              placeholder="e.g. Our Team"
                              className="h-10 rounded-lg border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium text-slate-600">Link URL</Label>
                            <Input
                              value={subSection.url}
                              onChange={(event) => handleSubSectionChange(index, "url", event.target.value)}
                              placeholder="/our-team"
                              className="h-10 rounded-lg border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium text-slate-600">Order</Label>
                            <Input
                              type="number"
                              value={subSection.order}
                              onChange={(event) => handleSubSectionChange(index, "order", event.target.value)}
                              placeholder="1"
                              className="h-10 rounded-lg border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                          <Switch
                            checked={subSection.active}
                            onCheckedChange={(checked) => handleSubSectionChange(index, "active", checked)}
                            className="scale-90 origin-left"
                          />
                          <Label className="text-xs font-medium text-slate-600">Active Link</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                  <Button type="submit" className="h-11 flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all hover:shadow-md" disabled={submitting}>
                    {submitting ? "Saving..." : editingId ? "Update Section" : "Create Section"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Table Column */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white overflow-hidden h-full">
            <CardHeader className="border-b border-slate-50 bg-white/50 pb-6 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ListTree className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg font-semibold text-slate-800">Saved Sections</CardTitle>
                </div>
                <CardDescription className="text-slate-500 mt-1">Currently active and hidden menu items.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="text-slate-500 font-medium h-12 pl-6">Title & URL</TableHead>
                    <TableHead className="text-slate-500 font-medium h-12 text-center">Sub-Links</TableHead>
                    <TableHead className="text-slate-500 font-medium h-12 text-center">Order</TableHead>
                    <TableHead className="text-slate-500 font-medium h-12 text-center">Status</TableHead>
                    <TableHead className="text-slate-500 font-medium text-right pr-6 h-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSections.length > 0 ? sortedSections.map((section) => (
                    <TableRow key={section._id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="font-semibold text-slate-700">{section.title}</div>
                        <div className="text-xs text-slate-400 font-mono mt-1 bg-slate-100 w-fit px-1.5 py-0.5 rounded-md">{section.url}</div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm">
                          {section.subSections?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4 font-medium text-slate-600">{section.order}</TableCell>
                      <TableCell className="text-center py-4">
                        <button
                          type="button"
                          onClick={() => toggleActive(section)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${section.active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        >
                          {section.active ? "Active" : "Hidden"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors" onClick={() => handleEdit(section)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" onClick={() => handleDeleteClick(section._id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell className="text-center py-12 text-slate-400" colSpan={5}>
                        No sections found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <DeleteDialog 
          isOpen={!!sectionToDelete} 
          onOpenChange={(isOpen) => { if (!isOpen) setSectionToDelete(null); }} 
          onConfirm={confirmDelete} 
          title="Delete Navbar Section"
          description="Are you sure you want to delete this navbar section? This action cannot be undone."
      />
    </div>
  );
};

export default NavbarSection;
