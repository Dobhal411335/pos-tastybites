import mongoose from "mongoose";
import Product from "@/models/menu/Product";
import Offer from "@/models/menu/Offer";
import Tax from "@/models/tax/Tax";
import ServiceTax from "@/models/tax/ServiceTax";
import Coupon from "@/models/menu/Coupon";
import {
  STAFF_DISCOUNT_CODE,
  calcStaffDiscountAmount,
  normalizeStaffDiscountPercent,
} from "@/lib/orders/staffDiscount";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function normalizeProductType(value) {
  return String(value || "").toUpperCase() === "BAR" ? "BAR" : "KITCHEN";
}

function taxFromTaxData(taxData, unitPrice) {
  if (!taxData) return 0;
  const pct = Number(taxData.totalPercentage) || 0;
  const fixed = Number(taxData.totalFixed) || 0;
  return (unitPrice * pct) / 100 + fixed;
}

function taxFromTaxDocs(taxes, unitPrice) {
  if (!Array.isArray(taxes) || taxes.length === 0) return 0;
  let pct = 0;
  let fixed = 0;
  for (const t of taxes) {
    if (!t || String(t.status || "").toLowerCase() === "inactive") continue;
    const isPercent = String(t.type || "").toLowerCase().includes("percent");
    if (isPercent) pct += Number(t.value) || 0;
    else fixed += Number(t.value) || 0;
  }
  return (unitPrice * pct) / 100 + fixed;
}

function resolveVariantUnitPrice(product, sizes = []) {
  const variants = Array.isArray(product.variants)
    ? product.variants.filter((v) => v && v.status !== false)
    : [];

  const sizeNames = sizes.filter(
    (s) => s && !/^standard$/i.test(s) && !/^extra$/i.test(s),
  );

  if (sizeNames.length > 0 && variants.length > 0) {
    let sum = 0;
    let matched = 0;
    for (const size of sizeNames) {
      const v = variants.find(
        (x) => String(x.size).toLowerCase() === String(size).toLowerCase(),
      );
      if (v) {
        sum += Number(v.price) || 0;
        matched += 1;
      }
    }
    if (matched > 0) return sum;
  }

  if (variants.length === 1) return Number(variants[0].price) || 0;
  if (variants.length > 1) {
    // No size selected: use cheapest active variant as base (POS usually picks size)
    return Math.min(...variants.map((v) => Number(v.price) || 0));
  }

  // Legacy products may expose a virtual/plain price on lean docs
  return Number(product.price) || 0;
}

function resolveAddonOnlyPrice(product, options = []) {
  const addons = Array.isArray(product.addons)
    ? product.addons.filter((a) => a && a.status !== false)
    : [];
  if (!addons.length) return 0;

  let sum = 0;
  let matched = 0;
  for (const opt of options) {
    const label = String(opt || "").trim();
    if (!label || /^size:/i.test(label)) continue;
    const addon = addons.find(
      (a) =>
        label === a.name ||
        new RegExp(`^extra:\\s*${escapeRegExp(a.name)}$`, "i").test(label),
    );
    if (addon) {
      sum += Number(addon.price) || 0;
      matched += 1;
    }
  }
  return matched > 0 ? sum : 0;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addonExtra(product, options = []) {
  // Addons attached to a main/variant line (not standalone Extra lines)
  return resolveAddonOnlyPrice(product, options);
}

/**
 * Recalculate POS cart lines from Product/Offer documents.
 * Client qty/options/sizes are used; prices/taxes come from DB.
 *
 * Line types (matches Sales POS cart builders):
 * - Offer: isOffer / Offers category → Offer.price
 * - Extra: size === "Extra" → Product.addons price only
 * - Variant/plain: Product.variants (+ optional addon options on same line)
 *
 * Product-level coupon discounts are intentionally NOT applied here — POS does
 * not bake them into cart lines (order-level discountCode only).
 */
export async function repricePosCartItems({
  restaurantId,
  items,
  discountCode = null,
  staffDiscountPercent = null,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("Cart cannot be empty");
    err.status = 400;
    throw err;
  }

  const productIds = [];
  const offerIds = [];
  for (const item of items) {
    const id = item.id || item.menuItemId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
    const isOffer =
      Boolean(item.isOffer) || /^offers?$/i.test(String(item.category || ""));
    if (isOffer) offerIds.push(String(id));
    else productIds.push(String(id));
  }

  const [products, offers, globalTaxes, serviceTax] = await Promise.all([
    productIds.length
      ? Product.find({
          _id: { $in: productIds },
          restaurant: restaurantId,
          status: "Active",
        })
          .populate("taxes")
          .lean()
      : [],
    offerIds.length
      ? Offer.find({
          _id: { $in: offerIds },
          restaurant: restaurantId,
          status: true,
        }).lean()
      : [],
    Tax.find({ restaurant: restaurantId, status: "Active" }).lean(),
    ServiceTax.findOne({ restaurant: restaurantId, status: "Active" }).lean(),
  ]);

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const offerMap = new Map(offers.map((o) => [String(o._id), o]));
  const now = new Date();

  const formattedItems = [];
  let subTotal = 0;
  let taxTotal = 0;
  let serviceChargeOnItems = 0;

  for (const item of items) {
    const id = item.id || item.menuItemId;
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    if (qty > 999) {
      const err = new Error("Invalid quantity");
      err.status = 400;
      throw err;
    }

    const rawSize = item.size || "Standard";
    const isExtraLine = /^extra$/i.test(String(rawSize));
    const sizes = Array.isArray(item.sizes)
      ? item.sizes.filter(Boolean)
      : rawSize && rawSize !== "Standard" && !isExtraLine
        ? String(rawSize)
            .split(", ")
            .filter(Boolean)
        : [];
    const sizeLabel = isExtraLine
      ? "Extra"
      : sizes.length > 0
        ? sizes.join(", ")
        : rawSize || "Standard";
    const options = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
    const isOffer =
      Boolean(item.isOffer) || /^offers?$/i.test(String(item.category || ""));

    let unitPrice = 0;
    let unitTax = 0;
    let name = String(item.name || "").trim() || "Item";
    let productCode = "";
    let category = item.category || "ITEMS";
    let productType = normalizeProductType(item.productType);
    let inclusions = [];
    let choices = [];
    let drinks = [];

    if (isOffer) {
      const offer = offerMap.get(String(id));
      if (!offer) {
        const err = new Error(`Offer not found or inactive: ${name}`);
        err.status = 400;
        throw err;
      }
      if (offer.validFrom && now < new Date(offer.validFrom)) {
        const err = new Error(`Offer not yet valid: ${offer.name}`);
        err.status = 400;
        throw err;
      }
      if (offer.validTo && now > new Date(offer.validTo)) {
        const err = new Error(`Offer expired: ${offer.name}`);
        err.status = 400;
        throw err;
      }
      unitPrice = Number(offer.price) || 0;
      unitTax =
        taxFromTaxData(offer.taxData, unitPrice) ||
        taxFromTaxDocs(globalTaxes, unitPrice);
      name = offer.name;
      category = "Offers";
      productType = "KITCHEN";
      inclusions = Array.isArray(offer.inclusions)
        ? offer.inclusions.filter(Boolean)
        : Array.isArray(item.inclusions)
          ? item.inclusions.filter(Boolean)
          : [];
      choices = Array.isArray(offer.choices)
        ? offer.choices.filter(Boolean)
        : Array.isArray(item.choices)
          ? item.choices.filter(Boolean)
          : [];
      drinks = Array.isArray(offer.drinks)
        ? offer.drinks.filter(Boolean)
        : Array.isArray(item.drinks)
          ? item.drinks.filter(Boolean)
          : [];
    } else {
      const product = productMap.get(String(id));
      if (!product) {
        const err = new Error(`Product not found or inactive: ${name}`);
        err.status = 400;
        throw err;
      }

      if (isExtraLine) {
        // Standalone addon line from POS options modal — price is addon only
        unitPrice = resolveAddonOnlyPrice(product, options);
        if (unitPrice <= 0 && options[0]) {
          const err = new Error(`Addon not found on product: ${options[0]}`);
          err.status = 400;
          throw err;
        }
      } else {
        unitPrice =
          resolveVariantUnitPrice(product, sizes) + addonExtra(product, options);
      }

      if (product.taxData && (product.taxData.totalPercentage || product.taxData.totalFixed)) {
        unitTax = taxFromTaxData(product.taxData, unitPrice);
      } else if (product.taxes?.length) {
        unitTax = taxFromTaxDocs(product.taxes, unitPrice);
      } else {
        unitTax = taxFromTaxDocs(globalTaxes, unitPrice);
      }

      name = product.name;
      productCode = product.productCode || "";
      category = item.category || "ITEMS";
      productType = normalizeProductType(product.productType);
    }

    let unitServiceCharge = 0;
    if (serviceTax && String(serviceTax.type || "").toLowerCase().includes("percent")) {
      unitServiceCharge =
        (unitPrice * (Number(serviceTax.value) || 0)) / 100;
    }

    unitPrice = r2(unitPrice);
    unitTax = r2(unitTax);
    unitServiceCharge = r2(unitServiceCharge);

    formattedItems.push({
      menuItemId: id,
      name,
      productCode,
      category: isOffer ? "Offers" : category,
      size: sizeLabel,
      sizes: isExtraLine ? [] : sizes,
      qty,
      price: unitPrice,
      tax: unitTax,
      serviceCharge: unitServiceCharge,
      options,
      preparationStyle: item.preparationStyle || null,
      productType,
      isOffer,
      inclusions,
      choices,
      drinks,
      cartId: item.cartId || String(Date.now() + Math.random()),
    });

    subTotal += unitPrice * qty;
    taxTotal += unitTax * qty;
    serviceChargeOnItems += unitServiceCharge * qty;
  }

  subTotal = r2(subTotal);
  taxTotal = r2(taxTotal);

  let serviceChargeTotal = r2(serviceChargeOnItems);
  let serviceChargeName = null;
  if (serviceTax) {
    serviceChargeName = serviceTax.name || "Server Charge";
    if (!String(serviceTax.type || "").toLowerCase().includes("percent")) {
      // Amount-type service charge is order-level
      serviceChargeTotal = r2(Number(serviceTax.value) || 0);
    }
  }

  let discountTotal = 0;
  let resolvedDiscountCode = null;
  const staffPercent = normalizeStaffDiscountPercent(staffDiscountPercent);
  if (staffPercent > 0) {
    discountTotal = Math.min(
      calcStaffDiscountAmount(subTotal, staffPercent),
      subTotal,
    );
    resolvedDiscountCode = STAFF_DISCOUNT_CODE;
  } else if (discountCode) {
    const code = String(discountCode).trim().toUpperCase();
    const coupon = await Coupon.findOne({
      restaurant: restaurantId,
      code,
      status: "Active",
    }).lean();
    if (!coupon) {
      const err = new Error("Invalid or inactive discount code");
      err.status = 400;
      throw err;
    }
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      const err = new Error("Discount code is not active yet");
      err.status = 400;
      throw err;
    }
    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      const err = new Error("Discount code has expired");
      err.status = 400;
      throw err;
    }
    if (coupon.discountType === "percent") {
      discountTotal = r2((subTotal * (Number(coupon.value) || 0)) / 100);
    } else {
      discountTotal = r2(Number(coupon.value) || 0);
    }
    discountTotal = Math.min(discountTotal, subTotal);
    resolvedDiscountCode = coupon.code;
  }

  const totalAmount = r2(
    Math.max(0, subTotal - discountTotal + taxTotal + serviceChargeTotal),
  );

  return {
    formattedItems,
    subTotal,
    taxTotal,
    serviceChargeTotal,
    serviceChargeName,
    discountTotal,
    discountCode: resolvedDiscountCode,
    totalAmount,
  };
}
