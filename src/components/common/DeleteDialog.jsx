"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  title = "Delete Item", 
  description = "Are you sure you want to delete this item? This action cannot be undone." 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl p-6 border-slate-100 shadow-xl bg-white max-w-md font-sans gap-0">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-slate-800">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-slate-600 mb-6">{description}</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="h-11 rounded-xl border text-slate-600 hover:bg-slate-100 font-medium"
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }} 
            className="h-11 rounded-xl bg-red-600 text-white hover:bg-red-700 px-6 font-medium"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
