"use client";

import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SearchFilter() {
  return (
    <div className="relative z-10 mx-auto -mt-12 max-w-5xl px-6 sm:px-8">
      <div className="rounded-xl bg-white border border-zinc-200 p-8 shadow-lg text-zinc-800">
        
        {/* Texts */}
        <div className="text-center md:text-left mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 font-serif">
            Love at first bite.
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 font-medium mt-1 uppercase tracking-wider">
            Comfort of a home-cooked meal
          </p>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-zinc-50 p-4 rounded-lg border border-zinc-200">
          
          {/* Main Category */}
          <div className="w-full space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">
              Category
            </label>
            <Select>
              <SelectTrigger className="w-full h-11 bg-white text-zinc-800 rounded-md border-zinc-200 focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Main Category" />
              </SelectTrigger>
              <SelectContent className="bg-white text-zinc-800 border-zinc-200">
                <SelectItem value="burgers">Burgers & Wraps</SelectItem>
                <SelectItem value="platters">Roast & Platters</SelectItem>
                <SelectItem value="desserts">Desserts & Sides</SelectItem>
                <SelectItem value="beverages">Beverages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Our Product */}
          <div className="w-full space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">
              Select Dish
            </label>
            <Select>
              <SelectTrigger className="w-full h-11 bg-white text-zinc-800 rounded-md border-zinc-200 focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Our Product" />
              </SelectTrigger>
              <SelectContent className="bg-white text-zinc-800 border-zinc-200">
                <SelectItem value="classic-burger">Classic Cheeseburger</SelectItem>
                <SelectItem value="blt-wrap">Special BLT Wrap</SelectItem>
                <SelectItem value="roast-beef">Hot Roast Beef Platter</SelectItem>
                <SelectItem value="fried-chicken">Crispy Fried Chicken</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Button */}
          <div className="w-full pt-4 md:pt-0">
            <Button
              className="w-full h-11 bg-[#0F6B7A] hover:bg-[#0b505c] text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <Search className="h-4 w-4" />
              <span>Search Menu</span>
            </Button>
          </div>

        </div>

        {/* Small Notice Below */}
        <p className="text-[11px] text-center md:text-left text-zinc-400 mt-4 leading-relaxed font-medium uppercase tracking-wider">
          We offer flexible order options tailored to your needs—whether it&apos;s urgent same-day, or special events.
        </p>

      </div>
    </div>
  );
}
