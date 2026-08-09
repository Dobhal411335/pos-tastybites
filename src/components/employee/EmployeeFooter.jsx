"use client";

import { ArrowLeft, ArrowRight, LayoutDashboard, Grid, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export const EmployeeFooter = () => {
  const pathname = usePathname();
  const isSalesPos = pathname?.startsWith("/sales");

  return (
    <footer className="sticky bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">

        {/* Previous */}
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {isSalesPos && (
            <Button
              asChild
              variant="outline"
              className="rounded hover:bg-orange-500 hover:text-white hidden sm:inline-flex"
            >
              <Link href="/sales/print-jobs">
                <Printer className="mr-2 h-4 w-4" />
                Print Jobs
              </Link>
            </Button>
          )}
          {isSalesPos ? (
            <Button
              asChild
              variant="outline"
              className="rounded hover:bg-orange-500 hover:text-white"
            >
              <Link href="/sales/floor">
                <Grid className="mr-2 h-4 w-4" />
                Back to Floor
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="rounded hover:bg-orange-500 hover:text-white"
            >
              <Link href="/sales/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          )}
        </div>

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