"use client";

import { ArrowLeft, ArrowRight, Grid } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export const EmployeeFooter = () => {
  const pathname = usePathname();
  const isSalesPos = pathname?.startsWith("/sales") || pathname === "/floor" || pathname === "/today";
  // sales.localhost/floor rewrites to /sales/floor; pathname stays /floor in the browser
  const isFloorPage = pathname === "/sales/floor" || pathname === "/floor";
  const floorHref = pathname?.startsWith("/sales") ? "/sales/floor" : "/floor";

  // Floor page already has top nav + floor actions — hide redundant chrome
  if (isFloorPage) {
    return null;
  }

  return (
    <footer className="sticky bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-lg text-xs"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-lg text-xs"
          onClick={() => window.history.forward()}
        >
          Next
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </footer>
  );
};
