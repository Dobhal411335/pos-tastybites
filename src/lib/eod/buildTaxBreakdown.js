import mongoose from "mongoose";
import Product from "@/models/menu/Product";
import Tax from "@/models/tax/Tax";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Build per-tax amounts for an order at payment time.
 * Prefer product-linked taxes; fall back to active restaurant taxes prorated by rate.
 */
export async function buildTaxBreakdownForOrder(order, restaurantId) {
  const items = Array.isArray(order.items) ? order.items : [];
  const productIds = [
    ...new Set(
      items
        .map((i) => i.menuItemId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const products =
    productIds.length > 0
      ? await Product.find({ _id: { $in: productIds } })
          .populate("taxes")
          .lean()
      : [];
  const productById = new Map(products.map((p) => [String(p._id), p]));

  const totals = new Map(); // key -> { taxId, name, rate, amount }

  const addTax = (tax, amount) => {
    if (!tax || !(amount > 0)) return;
    const key = String(tax._id || tax.name);
    const prev = totals.get(key) || {
      taxId: tax._id || null,
      name: tax.name || "Tax",
      rate: Number(tax.value) || 0,
      amount: 0,
    };
    prev.amount = r2(prev.amount + amount);
    totals.set(key, prev);
  };

  let usedProductTaxes = false;
  for (const item of items) {
    const product = item.menuItemId
      ? productById.get(String(item.menuItemId))
      : null;
    const taxes = product?.taxes?.filter((t) => t && t.status !== "Inactive");
    if (!taxes?.length) continue;
    usedProductTaxes = true;
    const lineBase = (Number(item.price) || 0) * (Number(item.qty) || 0);
    for (const tax of taxes) {
      const isPercent =
        String(tax.type || "")
          .toLowerCase()
          .includes("percent");
      const amount = isPercent
        ? (lineBase * (Number(tax.value) || 0)) / 100
        : (Number(tax.value) || 0) * (Number(item.qty) || 0);
      addTax(tax, amount);
    }
  }

  if (!usedProductTaxes) {
    const orderTax = r2(order.taxTotal);
    if (orderTax > 0) {
      const activeTaxes = await Tax.find({
        restaurant: restaurantId,
        status: "Active",
      }).lean();
      const percentTaxes = activeTaxes.filter((t) =>
        String(t.type || "")
          .toLowerCase()
          .includes("percent")
      );
      const rateSum = percentTaxes.reduce(
        (s, t) => s + (Number(t.value) || 0),
        0
      );
      if (percentTaxes.length && rateSum > 0) {
        let allocated = 0;
        percentTaxes.forEach((tax, idx) => {
          const share =
            idx === percentTaxes.length - 1
              ? r2(orderTax - allocated)
              : r2((orderTax * (Number(tax.value) || 0)) / rateSum);
          allocated = r2(allocated + share);
          addTax(tax, share);
        });
      } else if (activeTaxes.length === 1) {
        addTax(activeTaxes[0], orderTax);
      } else {
        totals.set("tax-total", {
          taxId: null,
          name: "Sales Tax",
          rate: 0,
          amount: orderTax,
        });
      }
    }
  }

  return [...totals.values()];
}
