"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

export default function CartBadge({ className, href = "/menu", onClick }) {
  const { itemCount } = useCart();
  const label = itemCount > 0 ? `Cart, ${itemCount} items` : "Cart";

  const classNames = cn(
    "relative inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-800 transition-colors hover:bg-zinc-100",
    className
  );

  const content = (
    <>
      <ShoppingBag className="h-5 w-5" />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {itemCount} items in cart
      </span>
      {itemCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white tabular-nums">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </>
  );

  if (typeof onClick === "function") {
    return (
      <button type="button" onClick={onClick} className={classNames} aria-label={label}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={classNames} aria-label={label}>
      {content}
    </Link>
  );
}
