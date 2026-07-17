"use client";

import React from "react";
import ProductCard from "./ProductCard";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";

export default function ProductGrid({ products, isLoading }) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!products || products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
