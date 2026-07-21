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
  Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor"

export default function MenuCategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([
    { id: 1, name: "Starters & Appetizers", items: 12, status: "Active" },
    { id: 2, name: "Gourmet Hamburgers", items: 8, status: "Active" },
    { id: 3, name: "Wood-Fired Pizzas", items: 15, status: "Active" },
    { id: 4, name: "Seasonal Desserts", items: 6, status: "Active" },
    { id: 5, name: "Premium Cocktails & Drinks", items: 24, status: "Inactive" },
    { id: 6, name: "Starters & Appetizers", items: 12, status: "Active" },
    { id: 7, name: "Gourmet Hamburgers", items: 8, status: "Active" },
    { id: 8, name: "Wood-Fired Pizzas", items: 15, status: "Active" },
    { id: 9, name: "Seasonal Desserts", items: 6, status: "Active" },
    { id: 10, name: "Premium Cocktails & Drinks", items: 24, status: "Inactive" },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    const newCat = {
      id: Date.now(),
      name: newCategoryName.trim(),
      items: 0,
      status: "Active",
    };

    setCategories([...categories, newCat]);
    setNewCategoryName("");
    setIsAddDialogOpen(false);
    toast.success("Category created successfully!");
  };

  const handleDeleteCategory = (id) => {
    setCategories(categories.filter((cat) => cat.id !== id));
    toast.success("Category deleted successfully.");
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
                  <Button className="h-10 px-4 font-semibold text-[15px] gap-2 transition-transform hover:scale-[1.02]" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                    <Plus className="w-5 h-5" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleCreateCategory}>
                    <DialogHeader>
                      <DialogTitle className="text-[22px] font-bold">Add Category</DialogTitle>
                      <DialogDescription className="text-[15px]">
                        Create a new category to group related menu items.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
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
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-11 hover:bg-red-600 hover:text-white px-6 font-semibold cursor-pointer">
                        Cancel
                      </Button>
                      <Button type="submit" className="h-11 px-6 font-semibold cursor-pointer" style={{ backgroundColor: PALETTE.accent, color: "white" }}>
                        Save Category
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
                      Category Name <ArrowUpDown className="inline w-3 h-3 ml-1" />
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
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <TableRow key={cat.id} className="h-16 hover:bg-zinc-50 transition-colors">
                        <TableCell className="px-6 font-semibold text-[15px] text-zinc-900">
                          {cat.name}
                        </TableCell>
                        <TableCell className="px-6">
                          {cat.status === "Active" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border-none px-2.5 py-1 text-[13px] font-semibold">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 border cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white">
                              <DropdownMenuItem className="text-[14px] font-medium cursor-pointer">
                                <Edit />  Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[14px] font-medium text-red-600 focus:bg-red-500 focus:text-white cursor-pointer"
                                onClick={() => handleDeleteCategory(cat.id)}
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
                      <TableCell colSpan={4} className="h-32 text-center text-zinc-500 text-[15px]">
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
    </div>
  );
}
