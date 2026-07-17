"use client";

import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProductCards() {
  const products = [
    {
      id: "burger-special",
      name: "Tasty Special Burgers",
      desc: "Deluxe cheese and prime beef stack with signature chef dressing.",
      price: "$10.94",
      tag: "Chef's Special",
      options: "Gluten-Free Available",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
      badge: "Signature Stack",
      rating: 4.9,
    },
    {
      id: "blt-wrap",
      name: "Gourmet BLT Wrap",
      desc: "Fresh organic avocado, hickory-smoked bacon, crisp bibb lettuce.",
      price: "$10.94",
      tag: "Lighter Fare",
      options: "Extra Bacon Option",
      image: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?q=80&w=600&auto=format&fit=crop",
      badge: "Fresh Wrap",
      rating: 4.8,
    },
    {
      id: "roast-beef",
      name: "Hot Roast Beef Platter",
      desc: "Tender slow-roasted beef slices served with rich rosemary au jus.",
      price: "$10.94",
      tag: "Classic Roast",
      options: "Double Roast Option",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
      badge: "Keg Classic",
      rating: 4.7,
    },
    {
      id: "best-chicken",
      name: "Crispy Golden Fried Chicken",
      desc: "Local grain-fed chicken, double-breaded in house spices.",
      price: "$10.94",
      tag: "Crispy Platter",
      options: "Spicy Option Available",
      image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?q=80&w=600&auto=format&fit=crop",
      badge: "House Specialty",
      rating: 4.9,
    },
  ];

  const handleAddToCart = (productName) => {
    toast.success(`${productName} added to order.`);
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <div
            key={product.id}
            className="group flex flex-col justify-between rounded-xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            {/* Image Wrap */}
            <div className="relative w-full h-[240px] bg-zinc-100">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-w-7xl) 25vw, 50vw, 100vw"
                className="object-cover transition-transform duration-75 group-hover:scale-[1.01]"
              />
              {/* Subtle Label */}
              <div className="absolute top-3 left-3 bg-zinc-950/80 text-white px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest">
                {product.tag}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1 text-[#12A594]">
                    <Star className="h-3.5 w-3.5 fill-[#12A594]" />
                    {product.rating}
                  </span>
                  <span>{product.options}</span>
                </div>
                <h3 className="font-bold text-zinc-900 text-base font-serif">
                  {product.name}
                </h3>
                <p className="text-xs text-zinc-500 font-light leading-relaxed">
                  {product.desc}
                </p>
              </div>

              {/* Price & Cart Action */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-zinc-900">
                    {product.price}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">+ Tax</span>
                </div>

                <Button
                  onClick={() => handleAddToCart(product.name)}
                  className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-none px-4 py-2 text-xs uppercase tracking-widest font-bold"
                >
                  Add To Cart
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
