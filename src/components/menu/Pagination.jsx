"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pagination({ currentPage, totalPages }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: true });
  };

  return (
    <div className="flex items-center justify-center gap-2 py-8 border-t border-[#ECECEC] mt-12">
      {/* Previous Page */}
      <Button
        variant="outline"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-none h-10 px-4 border-[#ECECEC] text-[#1F2937] hover:bg-zinc-50 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        <span>Prev</span>
      </Button>

      {/* Page Numbers */}
      {Array.from({ length: totalPages }).map((_, idx) => {
        const pageNumber = idx + 1;
        const isActive = pageNumber === currentPage;
        return (
          <Button
            key={pageNumber}
            variant={isActive ? "default" : "outline"}
            onClick={() => handlePageChange(pageNumber)}
            className={
              isActive
                ? "rounded-none h-10 w-10 bg-[#F97316] hover:bg-[#e06510] text-white font-bold"
                : "rounded-none h-10 w-10 border-[#ECECEC] text-[#1F2937] hover:bg-zinc-50 font-bold"
            }
          >
            {pageNumber}
          </Button>
        );
      })}

      {/* Next Page */}
      <Button
        variant="outline"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-none h-10 px-4 border-[#ECECEC] text-[#1F2937] hover:bg-zinc-50 disabled:opacity-50"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
