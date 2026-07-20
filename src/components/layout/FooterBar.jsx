"use client";

import { ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const FooterBar = () => {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Previous */}
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {/* Dashboard */}
        <Button
          asChild
          variant="outline"
          className="rounded hover:bg-orange-500 hover:text-white"
        >
          <Link href="/admin/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        {/* Next */}
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => window.history.forward()}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

      </div>
    </footer>
  );
};