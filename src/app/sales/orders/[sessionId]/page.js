"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Mic,
  NotebookPen,
  CheckCircle2,
  X,
  Tag,
  User,
  Phone,
  MapPin,
  Trash2,
  Loader2,
  LayoutGrid,
  List,
  Coffee,
  Utensils,
  UtensilsCrossed,
  Wine,
  Beer,
  Cake,
  IceCream,
  Pizza,
  Sandwich,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import TodayOrderPaymentModal from "@/components/sales/TodayOrderPaymentModal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  OFFER_CATEGORY,
  isOfferItem,
  cleanOfferList,
  getOfferDetailLines,
  buildOfferOptions,
} from "@/utils/offerDetails";

function getCartFingerprint(items) {
  return (items || [])
    .map((item) => `${item.cartId || item.id}:${item.qty}:${item.name}:${item.size || ""}`)
    .sort()
    .join("|");
}

function OfferChipRow({ label, items }) {
  if (!items.length) return null;
  return (
    <div className="flex gap-2 items-start">
      <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 w-[64px] pt-0.5 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {items.map((value) => (
          <span
            key={`${label}-${value}`}
            className="text-[11px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-md px-1.5 py-0.5"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OrderPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
  const sessionId = params.sessionId;

  // Data states
  const [categories, setCategories] = useState(["All"]);
  const [menuItems, setMenuItems] = useState([]);
  const [globalTaxes, setGlobalTaxes] = useState([]);
  const [serviceTax, setServiceTax] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Existing states
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [orderStatus, setOrderStatus] = useState("Draft");

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantQtyBySize, setVariantQtyBySize] = useState({});
  const [addonQtyById, setAddonQtyById] = useState({});
  const [selectedPreparationStyle, setSelectedPreparationStyle] = useState("");

  // New states
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestTable, setGuestTable] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const cartIdSeq = useRef(0);

  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState("customer"); // 'customer' | 'kot' | 'bar'
  const [printOrderData, setPrintOrderData] = useState(null);
  const [printKotItems, setPrintKotItems] = useState([]);
  const [printTaxBreakdown, setPrintTaxBreakdown] = useState([]);
  const [redirectAfterPrint, setRedirectAfterPrint] = useState(false);
  const [serverName, setServerName] = useState("Server");
  const [kotCartFingerprint, setKotCartFingerprint] = useState(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isReleasingTable, setIsReleasingTable] = useState(false);

  // View States
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [heads, setHeads] = useState([{ _id: "all", name: "All" }]);
  const [productHeads, setProductHeads] = useState([]);
  const [activeHead, setActiveHead] = useState("All");
  const [offers, setOffers] = useState([]);
  const [isClearOrderModalOpen, setIsClearOrderModalOpen] = useState(false);

  const headIconMap = {
    Breakfast: Coffee,
    Brunch: Sandwich,
    Lunch: Pizza,
    Dinner: UtensilsCrossed,
    "Kids Menu": User,
    Beverages: Coffee,
    Desserts: Cake,
    "Bar & Cocktails": Wine,
    Offer: Tag,
  };

  const getHeadIcon = (headName) => {
    if (headName === "All")
      return <LayoutGrid className="w-6 h-6 mb-1" strokeWidth={1.5} />;
    if (headName === "Offer")
      return <Tag className="w-6 h-6 mb-1" strokeWidth={1.5} />;
    const Icon = headIconMap[headName] || Utensils;
    return <Icon className="w-6 h-6 mb-1" strokeWidth={1.5} />;
  };

  const isOfferActive = (offer) => {
    if (!offer || offer.status === false) return false;
    // Validity window checked when adding; list shows status=true offers
    return true;
  };

  const isOfferInDateRange = (offer) => {
    if (!offer) return false;
    const now = Date.now();
    if (offer.validFrom && new Date(offer.validFrom).getTime() > now) return false;
    if (offer.validTo && new Date(offer.validTo).getTime() < now) return false;
    return true;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, prodRes, taxRes, serviceTaxRes, headRes, phRes, offerRes] =
          await Promise.all([
            fetch("/api/menu/categories"),
            fetch("/api/menu/products"),
            fetch("/api/tax"),
            fetch("/api/tax/servicetax?active=1"),
            fetch("/api/menu/heads"),
            fetch("/api/menu/product-heads"),
            fetch("/api/menu/offers"),
          ]);
        const catJson = await catRes.json();
        const prodJson = await prodRes.json();
        const taxJson = await taxRes.json();
        const serviceTaxJson = await serviceTaxRes.json();
        const headJson = await headRes.json();
        const phJson = await phRes.json();
        const offerJson = await offerRes.json();

        if (catJson.success) {
          const cats = catJson.data.map((c) => c.name);
          setCategories(["All", ...cats]);
        }
        if (prodJson.success) {
          setMenuItems(prodJson.data);
        }
        if (taxJson.success) {
          setGlobalTaxes(taxJson.data.filter((t) => t.status === "Active"));
        }
        if (serviceTaxJson.success) {
          const list = Array.isArray(serviceTaxJson.data)
            ? serviceTaxJson.data
            : [];
          setServiceTax(list.find((t) => t.status === "Active") || list[0] || null);
        }
        if (headJson.success) {
          const menuHeads = (headJson.data || []).filter(
            (h) => String(h.name).toLowerCase() !== "offer",
          );
          setHeads([
            { _id: "all", name: "All" },
            ...menuHeads,
            { _id: "offer", name: "Offer" },
          ]);
        } else {
          setHeads([
            { _id: "all", name: "All" },
            { _id: "offer", name: "Offer" },
          ]);
        }
        if (phJson.success) {
          setProductHeads(phJson.data);
        }
        if (offerJson.success) {
          setOffers(Array.isArray(offerJson.data) ? offerJson.data : []);
        }

        // Fetch session and existing order data if not "new"
        if (sessionId !== "new") {
          const sessionRes = await fetch(`/api/sales/sessions?sessionId=${sessionId}`);
          const sessionJson = await sessionRes.json();
          if (sessionJson.success && sessionJson.data) {
            const currentSession = sessionJson.data;
            const tableNumber =
              currentSession.primaryTable?.tableNumber ||
              currentSession.tableNumber ||
              null;
            const floorName =
              currentSession.floor?.name ||
              currentSession.floorName ||
              null;
            setSessionData({
              ...currentSession,
              tableNumber,
              floorName,
            });
            if (tableNumber) setGuestTable(tableNumber);
          }

          // Fetch existing order for this session
          const orderRes = await fetch(
            `/api/orders/employee?sessionId=${sessionId}`,
          );
          const orderJson = await orderRes.json();
          if (orderJson.success && orderJson.data) {
            const existingOrder = orderJson.data;
            setActiveOrder(existingOrder);
            setOrderStatus(existingOrder.status);
            setOrderNote(existingOrder.specialNote || "");
            if (existingOrder.partyName || existingOrder.guestName) {
              setGuestName(existingOrder.partyName || existingOrder.guestName);
            }

            // Reconstruct cart
            const restoredCart = existingOrder.items.map((item) => {
              const style = item.preparationStyle || null;
              const extras = (item.options || []).filter(
                (o) => !String(o).toLowerCase().startsWith("style:"),
              );
              const offer = isOfferItem(item);
              const inclusions = cleanOfferList(item.inclusions);
              const choices = cleanOfferList(item.choices);
              const drinks = cleanOfferList(item.drinks);
              const parts = [];
              if (item.size && item.size !== "Standard")
                parts.push(`Size: ${item.size}`);
              if (style) parts.push(`${style}`);
              if (offer) {
                parts.push(
                  ...getOfferDetailLines({
                    inclusions,
                    choices,
                    drinks,
                    options: item.options,
                  }).map((line) => `${line.label}: ${line.value}`),
                );
              } else if (extras.length > 0) {
                parts.push(`Extras: ${extras.join(", ")}`);
              }
              return {
                id: item.menuItemId,
                name: item.name,
                productCode: item.productCode || "",
                category: offer ? OFFER_CATEGORY : item.category || "ITEMS",
                price: item.price,
                tax: item.tax,
                serviceCharge: item.serviceCharge || 0,
                qty: item.qty,
                size: item.size,
                sizes:
                  item.sizes ||
                  (item.size && item.size !== "Standard"
                    ? String(item.size).split(", ").filter(Boolean)
                    : []),
                preparationStyle: style,
                options: item.options || [],
                productType: item.productType === "BAR" ? "BAR" : "KITCHEN",
                isOffer: offer,
                inclusions,
                choices,
                drinks,
                modifier: parts.length > 0 ? parts.join(" | ") : undefined,
                cartId: item.cartId || Date.now() + Math.random(),
              };
            });
            setCart(restoredCart);
            setKotCartFingerprint(getCartFingerprint(restoredCart));

            if (existingOrder.discountCode) {
              // Note: We don't have the full discount object, but we have the code and amount
              setAppliedDiscount({
                code: existingOrder.discountCode,
                value: existingOrder.discountTotal,
                type: "$",
              });
            }
          }
        }
      } catch (err) {
        toast.error("Failed to load order data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  useEffect(() => {
    if (currentUser) {
      const fName = currentUser.firstName || "";
      const lName = currentUser.lastName || "";
      const fullName =
        currentUser.name || `${fName} ${lName}`.trim() || "Server";
      setServerName(fullName);
    }
  }, [currentUser]);

  const fetchOrderOnly = useCallback(async () => {
    if (sessionId === "new") return;
    try {
      const orderRes = await fetch(
        `/api/orders/employee?sessionId=${sessionId}`,
      );
      const orderJson = await orderRes.json();
      if (orderJson.success && orderJson.data) {
        const existingOrder = orderJson.data;
        setActiveOrder(existingOrder);
        setOrderStatus(existingOrder.status);
      }
    } catch (err) {
      console.error(err);
    }
  }, [sessionId]);

  useEffect(() => {
    const handleReconnect = () => {
      fetchOrderOnly();
    };

    window.addEventListener("socket:reconnect", handleReconnect);

    if (socket) {
      socket.on("order:updated", fetchOrderOnly);
      socket.on("payment:completed", fetchOrderOnly);
    }

    return () => {
      window.removeEventListener("socket:reconnect", handleReconnect);
      if (socket) {
        socket.off("order:updated", fetchOrderOnly);
        socket.off("payment:completed", fetchOrderOnly);
      }
    };
  }, [socket, fetchOrderOnly]);

  const filteredProducts = menuItems.filter((p) => {
    if (activeHead === "Offer") return false;
    let matchesHead = true;
    if (viewMode === "grid" && activeHead !== "All") {
      const ph = productHeads.find((h) => h.head?.name === activeHead);
      if (ph) {
        matchesHead = ph.categories.some((c) => c.products.includes(p._id));
      } else {
        matchesHead = false;
      }
    }
    const matchesCat =
      viewMode === "list"
        ? activeCategory === "All" ||
          (p.category && p.category.name === activeCategory)
        : true;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesHead && matchesCat && matchesSearch;
  });

  const filteredOffers = offers.filter((offer) => {
    if (!isOfferActive(offer)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const haystack = [
      offer.name,
      ...(offer.inclusions || []),
      ...(offer.choices || []),
      ...(offer.drinks || []),
      ...(offer.taxData?.taxNames || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const calculateOfferTax = (offer, basePrice) => {
    const price = Number(basePrice) || 0;
    if (offer?.taxData) {
      const pct = Number(offer.taxData.totalPercentage) || 0;
      const fixed = Number(offer.taxData.totalFixed) || 0;
      return (price * pct) / 100 + fixed;
    }
    return calculateItemTax(offer, price);
  };

  const calculateItemTax = (item, basePrice) => {
    let taxesToUse =
      item.taxes && Array.isArray(item.taxes) && item.taxes.length > 0
        ? item.taxes
        : globalTaxes;
    if (!taxesToUse || taxesToUse.length === 0) return 0;

    const pctTaxes = taxesToUse
      .filter((t) => t?.type?.toLowerCase().includes("percent"))
      .reduce((sum, t) => sum + (t.value || 0), 0);
    const fixedTaxes = taxesToUse
      .filter((t) => t?.type && !t.type.toLowerCase().includes("percent"))
      .reduce((sum, t) => sum + (t.value || 0), 0);
    return (basePrice * pctTaxes) / 100 + fixedTaxes;
  };

  /** Percent service charge on unit price; Amount type is order-level only. */
  const calculateItemServiceCharge = (basePrice) => {
    if (!serviceTax || serviceTax.status === "Inactive") return 0;
    const type = String(serviceTax.type || "").toLowerCase();
    if (!type.includes("percent")) return 0;
    return (Number(basePrice) || 0) * (Number(serviceTax.value) || 0) / 100;
  };

  const serviceChargeLabel = serviceTax?.name || "Server Charge";
  const hasServiceTax = Boolean(
    serviceTax && serviceTax.status !== "Inactive",
  );

  const calculateItemDiscount = (item, basePrice) => {
    if (
      item.discount &&
      item.discount.status === "Active" &&
      item.discountActive !== false
    ) {
      if (item.discount.discountType === "percent") {
        return basePrice * (item.discount.value / 100);
      } else {
        return item.discount.value;
      }
    }
    return 0;
  };

  const generateTaxBreakdown = () => {
    // Receipt shows a single HST line with the combined tax total (not per-component %)
    let hstTotal = 0;
    cart.forEach((item) => {
      const taxesToUse =
        item.taxes && Array.isArray(item.taxes) && item.taxes.length > 0
          ? item.taxes
          : globalTaxes;
      if (!taxesToUse) return;
      taxesToUse.forEach((t) => {
        const amount =
          t.type && t.type.toLowerCase().includes("percent")
            ? item.price * item.qty * (t.value / 100)
            : t.value * item.qty;
        hstTotal += amount;
      });
    });
    if (hstTotal <= 0) return [];
    return [{ name: "HST", amount: hstTotal }];
  };

  const handleOpenOptions = (item) => {
    setSelectedProduct(item);
    const initialVariants = {};
    if (item.variants && item.variants.length > 0) {
      initialVariants[item.variants[0].size] = 1;
    }
    setVariantQtyBySize(initialVariants);
    setAddonQtyById({});
    const styles = (item.preparationStyles || []).filter(Boolean);
    setSelectedPreparationStyle(styles.length === 1 ? styles[0] : "");
    setIsOptionsModalOpen(true);
  };

  const setVariantQty = (size, qty) => {
    const next = Math.max(0, Math.floor(Number(qty) || 0));
    setVariantQtyBySize((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[size];
      else copy[size] = next;
      return copy;
    });
  };

  const setAddonQty = (addon, qty) => {
    const next = Math.max(0, Math.floor(Number(qty) || 0));
    setAddonQtyById((prev) => {
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[addon._id];
      } else {
        copy[addon._id] = { qty: next, addon };
      }
      return copy;
    });
  };

  const formatSizeLabel = (sizes) => {
    if (Array.isArray(sizes) && sizes.length > 0) return sizes.join(", ");
    if (typeof sizes === "string" && sizes.trim()) return sizes;
    return "Standard";
  };

  const productNeedsOptions = (product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasAddons = product.addons && product.addons.length > 0;
    const hasStyles =
      product.preparationStyles &&
      product.preparationStyles.filter(Boolean).length > 0;
    return hasVariants || hasAddons || hasStyles;
  };

  const addToCart = (product) => {
    if (productNeedsOptions(product)) {
      handleOpenOptions(product);
      return;
    }

    const price = product.price || 0;
    const itemTax = calculateItemTax(product, price);
    const itemServiceCharge = calculateItemServiceCharge(price);

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.id === product._id && !item.modifier && !item.preparationStyle,
      );
      if (existing) {
        return prev.map((item) =>
          item.id === product._id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          id: product._id,
          name: product.name,
          productCode: product.productCode || "",
          category: product.category?.name || "ITEMS",
          price,
          tax: itemTax,
          serviceCharge: itemServiceCharge,
          qty: 1,
          size: "Standard",
          sizes: [],
          preparationStyle: null,
          options: [],
          productType: product.productType === "BAR" ? "BAR" : "KITCHEN",
          cartId: Date.now(),
        },
      ];
    });
  };

  const addOfferToCart = (offer) => {
    if (!isOfferInDateRange(offer)) {
      toast.error("This offer is not valid today");
      return;
    }
    const price = Number(offer.price) || 0;
    const itemTax = calculateOfferTax(offer, price);
    const itemServiceCharge = calculateItemServiceCharge(price);
    const inclusions = cleanOfferList(offer.inclusions);
    const choices = cleanOfferList(offer.choices);
    const drinks = cleanOfferList(offer.drinks);
    const extras = buildOfferOptions({ inclusions, choices, drinks });

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === offer._id && isOfferItem(item),
      );
      if (existing) {
        return prev.map((item) =>
          item.id === offer._id && isOfferItem(item)
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: offer._id,
          name: offer.name,
          productCode: "",
          category: OFFER_CATEGORY,
          price,
          tax: itemTax,
          serviceCharge: itemServiceCharge,
          qty: 1,
          size: "Standard",
          sizes: [],
          preparationStyle: null,
          options: extras,
          modifier: extras.length ? extras.join(" • ") : null,
          productType: "KITCHEN",
          cartId: Date.now(),
          isOffer: true,
          inclusions,
          choices,
          drinks,
        },
      ];
    });
    toast.success(`${offer.name} added`);
  };

  const addModifiedItemToCart = () => {
    if (!selectedProduct) return;

    const hasVariants =
      selectedProduct.variants && selectedProduct.variants.length > 0;
    const variantEntries = Object.entries(variantQtyBySize).filter(
      ([, qty]) => qty > 0,
    );
    if (hasVariants && variantEntries.length === 0) {
      toast.error("Select at least one variant");
      return;
    }

    const addonEntries = Object.values(addonQtyById).filter(
      (entry) => entry?.qty > 0 && entry?.addon,
    );

    const baseTs = ++cartIdSeq.current;
    const newLines = [];

    if (hasVariants) {
      variantEntries.forEach(([size, qty], idx) => {
        const variant = selectedProduct.variants.find((v) => v.size === size);
        const unitPrice = Number(variant?.price) || 0;
        const unitTax = calculateItemTax(selectedProduct, unitPrice);
        const unitServiceCharge = calculateItemServiceCharge(unitPrice);
        const options = [];
        if (selectedPreparationStyle) options.push(selectedPreparationStyle);
        const parts = [`Size: ${size}`];
        if (selectedPreparationStyle) parts.push(selectedPreparationStyle);

        newLines.push({
          id: selectedProduct._id,
          cartId: baseTs + idx,
          name: selectedProduct.name,
          productCode: selectedProduct.productCode || "",
          category: selectedProduct.category?.name || "ITEMS",
          price: unitPrice,
          tax: unitTax,
          serviceCharge: unitServiceCharge,
          qty,
          size,
          sizes: [size],
          preparationStyle: selectedPreparationStyle || null,
          options,
          productType:
            selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
          modifier: parts.join(" | "),
        });
      });
    } else {
      const unitPrice = selectedProduct.price || 0;
      const unitTax = calculateItemTax(selectedProduct, unitPrice);
      const unitServiceCharge = calculateItemServiceCharge(unitPrice);
      const options = [];
      if (selectedPreparationStyle) options.push(selectedPreparationStyle);
      newLines.push({
        id: selectedProduct._id,
        cartId: baseTs,
        name: selectedProduct.name,
        productCode: selectedProduct.productCode || "",
        category: selectedProduct.category?.name || "ITEMS",
        price: unitPrice,
        tax: unitTax,
        serviceCharge: unitServiceCharge,
        qty: 1,
        size: "Standard",
        sizes: [],
        preparationStyle: selectedPreparationStyle || null,
        options,
        productType: selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
        modifier: selectedPreparationStyle || undefined,
      });
    }

    addonEntries.forEach((entry, idx) => {
      const addon = entry.addon;
      const unitPrice = Number(addon.price) || 0;
      const unitTax = calculateItemTax(selectedProduct, unitPrice);
      const unitServiceCharge = calculateItemServiceCharge(unitPrice);
      newLines.push({
        id: selectedProduct._id,
        cartId: baseTs + 1000 + idx,
        name: selectedProduct.name,
        productCode: selectedProduct.productCode || "",
        category: selectedProduct.category?.name || "ITEMS",
        price: unitPrice,
        tax: unitTax,
        serviceCharge: unitServiceCharge,
        qty: entry.qty,
        size: "Extra",
        sizes: [],
        preparationStyle: null,
        options: [addon.name],
        productType: selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
        modifier: `Extra: ${addon.name}`,
      });
    });

    if (newLines.length === 0) {
      toast.error("Select a variant or extra");
      return;
    }

    setCart((prev) => [...prev, ...newLines]);
    setIsOptionsModalOpen(false);
    setSelectedPreparationStyle("");
    setVariantQtyBySize({});
    setAddonQtyById({});
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id || item.cartId === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => (item.cartId || item.id) !== id));
  };

  const getDisplayTableNo = () => {
    return (
      activeOrder?.tableNo ||
      sessionData?.tableNumber ||
      (sessionId === "new" ? guestTable : "") ||
      ""
    );
  };

  const resolvePartyName = (nameOverride) => {
    const trimmed = (nameOverride ?? guestName ?? "").trim();
    if (trimmed) return trimmed;

    const tableNo = getDisplayTableNo();
    const guestCount = sessionData?.guestCount;
    if (tableNo && guestCount != null) {
      return `${tableNo} · ${guestCount} guest${guestCount === 1 ? "" : "s"}`;
    }
    if (tableNo) return `${tableNo}`;
    if (guestCount != null) {
      return `${guestCount} guest${guestCount === 1 ? "" : "s"}`;
    }
    return "Walk-in";
  };

  const handleSendToKitchen = () => {
    if (cart.length === 0) return;
    setIsKitchenModalOpen(true);
  };

  const handleConfirmKitchen = async () => {
    if (sessionId === "new" && !guestName.trim() && !guestTable.trim()) {
      toast.error("Enter a party name or table number.");
      return;
    }

    const partyName = resolvePartyName();

    try {
      setIsSubmitting(true);
      const payload = {
        items: cart,
        subTotal: subtotal,
        taxTotal: totalTax,
        serviceChargeTotal,
        serviceChargeName: hasServiceTax ? serviceChargeLabel : null,
        discountTotal: discountAmount,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        totalAmount: total,
        specialNote: orderNote,
        sessionId: sessionId !== "new" ? sessionId : null,
        tableNo: sessionId === "new" ? guestTable : undefined,
        guestName: partyName,
        partyName,
        guestCount: sessionData?.guestCount ?? null,
        orderType: orderType,
      };

      const res = await fetch("/api/orders/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        const ticketType = json.data.ticketType || "KOT";
        const isBarTicket = ticketType === "BAR_RECEIPT";
        toast.success(
          isBarTicket
            ? "Bar ticket created!"
            : "Order sent to kitchen!",
        );
        setIsKitchenModalOpen(false);
        setGuestName(partyName);
        setActiveOrder(json.data);
        setOrderStatus("PENDING");
        setKotCartFingerprint(getCartFingerprint(cart));

        // Check if there are items to print for KOT / Bar receipt
        if (json.data.kotPayload && json.data.kotPayload.length > 0) {
          setPrintOrderData({
            ...json.data,
            partyName,
            guestName: partyName,
            guestCount: sessionData?.guestCount ?? json.data.guestCount ?? null,
          });
          setPrintKotItems(json.data.kotPayload);
          setPrintType(isBarTicket ? "bar" : "kot");
          setRedirectAfterPrint(false);
          setIsPrintModalOpen(true);
        }
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalTax = cart.reduce(
    (sum, item) => sum + (item.tax || 0) * item.qty,
    0,
  );
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "%"
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  const serviceChargeTotal = !hasServiceTax
    ? 0
    : String(serviceTax.type || "")
          .toLowerCase()
          .includes("percent")
      ? cart.reduce(
          (sum, item) => sum + (item.serviceCharge || 0) * item.qty,
          0,
        )
      : Number(serviceTax.value) || 0;
  const total = subtotal - discountAmount + totalTax + serviceChargeTotal;

  const hasSentKot =
    Boolean(activeOrder) &&
    orderStatus !== "Draft" &&
    kotCartFingerprint === getCartFingerprint(cart);
  const canPay = hasSentKot && cart.length > 0 && orderStatus !== "PAID";

  const openPaymentModal = () => {
    if (orderStatus === "PAID") return;
    if (!hasSentKot) {
      toast.error("Send the order to kitchen (KOT) before taking payment.");
      return;
    }
    if (!activeOrder) {
      toast.error("Send the order to kitchen (KOT) before taking payment.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const goToFloor = () => {
    router.push("/sales/floor");
  };

  const handleReleaseTable = async (shouldRelease) => {
    if (!shouldRelease || sessionId === "new") {
      setIsReleaseModalOpen(false);
      goToFloor();
      return;
    }
    try {
      setIsReleasingTable(true);
      const res = await fetch("/api/sales/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "RELEASE" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Table released.");
        setIsReleaseModalOpen(false);
        goToFloor();
      } else {
        toast.error(json.message || "Failed to release table.");
      }
    } catch (err) {
      toast.error("Failed to release table.");
    } finally {
      setIsReleasingTable(false);
    }
  };

  const handleClearOrder = () => {
    setCart([]);
    setOrderNote("");
    setAppliedDiscount(null);
    setIsClearOrderModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-4 text-zinc-500 font-semibold">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-115px)] w-full bg-zinc-50 font-sans overflow-hidden border border-zinc-200 rounded-xl shadow-sm">
      {/* SPLIT PANELS */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANEL (MENU) */}
        <div className="w-[65%] flex flex-col border-r border-zinc-200 bg-zinc-50">
          {/* LEFT PANEL HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200 shrink-0">
            <div className="min-w-0">
              <h2 className="text-[17px] font-black text-zinc-900">
                Create Order
              </h2>
              <p className="text-xs font-semibold text-zinc-800 mt-0.5 truncate">
                {sessionId === "new"
                  ? guestTable
                    ? `${guestTable} · Takeaway`
                    : "Takeaway"
                  : [
                      sessionData?.tableNumber
                        ? `${sessionData.tableNumber}`
                        : null,
                      sessionData?.floorName || null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Loading table..."}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Heads Grid (GRID VIEW) */}
          {viewMode === "grid" && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-zinc-200 shrink-0 overflow-x-auto custom-scrollbar">
              {heads.map((head) => (
                <button
                  key={head._id}
                  onClick={() => setActiveHead(head.name)}
                  className={`flex flex-col items-center justify-center min-w-[76px] h-[64px] rounded-lg transition-all border ${
                    activeHead === head.name
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  {getHeadIcon(head.name)}
                  <span className="text-[10px] mt-1 font-black uppercase tracking-wider">
                    {head.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search & Category Tabs (LIST VIEW) */}
          {viewMode === "list" && (
            <div className="flex items-center gap-2 px-4 py-4 bg-white border-b border-zinc-200 shrink-0">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-10 h-11 bg-zinc-50 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
                />
              </div>
              <div className="w-80">
                <Select
                  value={activeCategory}
                  onValueChange={setActiveCategory}
                >
                  <SelectTrigger className="w-full h-11 bg-white border-zinc-200 rounded-lg font-bold text-zinc-900 focus:ring-blue-500">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="font-semibold text-zinc-900"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex-1 bg-zinc-50/50 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col p-4 gap-3">
              {activeHead === "Offer" ? (
                filteredOffers.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-10">
                    No active offers available.
                  </p>
                ) : (
                  filteredOffers.map((offer) => {
                    const basePrice = Number(offer.price) || 0;
                    const taxAmount = calculateOfferTax(offer, basePrice);
                    const totalPrice =
                      Number(offer.totalPrice) > 0
                        ? Number(offer.totalPrice)
                        : basePrice + taxAmount;
                    const inclusions = cleanOfferList(offer.inclusions);
                    const choices = cleanOfferList(offer.choices);
                    const drinks = cleanOfferList(offer.drinks);

                    return (
                      <div
                        key={offer._id}
                        className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
                      >
                        <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200 gap-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 shrink-0">
                              OFFER
                            </span>
                            <span className="font-bold text-zinc-900 text-xs md:text-sm leading-tight">
                              {offer.name}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <OfferChipRow label="Includes" items={inclusions} />
                            <OfferChipRow label="Choices" items={choices} />
                            <OfferChipRow label="Drinks" items={drinks} />
                            {taxAmount > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 w-[64px] shrink-0">
                                  HST
                                </span>
                                <span className="text-xs font-bold text-zinc-800">
                                  ${taxAmount.toFixed(2)}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className="w-28 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Price
                            </span>
                            <span className="text-sm font-black text-zinc-900">
                              ${totalPrice.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium text-center leading-tight">
                              ${basePrice.toFixed(2)}
                              {taxAmount > 0
                                ? ` + $${taxAmount.toFixed(2)} HST`
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className="w-full sm:w-32 shrink-0 p-2 flex items-center justify-center">
                          <Button
                            className="w-full h-full min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                            onClick={() => addOfferToCart(offer)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                filteredProducts.map((product) => {
                const hasOptions = productNeedsOptions(product);
                const isAvailable = product.inStock !== false;
                const basePrice =
                  product.variants && product.variants.length > 0
                    ? product.variants[0].price
                    : product.price || 0;
                const taxAmount = calculateItemTax(product, basePrice);

                return (
                  <div
                    key={product._id}
                    className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md min-h-[76px]"
                  >
                    {/* Food Item Info */}
                    <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        {product.productCode ? (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded px-1.5 py-0.5 shrink-0">
                            {product.productCode}
                          </span>
                        ) : null}
                        <span className="font-bold text-zinc-900 text-xs md:text-sm">
                          {product.name}
                        </span>
                        {!isAvailable && (
                          <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 shrink-0">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-500">
                          {product.category?.name || "Uncategorized"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-20 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Price
                        </span>
                        <span className="text-sm font-black text-zinc-900">
                          ${basePrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Add To Cart Button */}
                    <div className="w-full sm:w-32 shrink-0 p-2 flex items-center justify-center">
                      <Button
                        className="w-full h-full min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
                        disabled={!isAvailable}
                        onClick={() =>
                          hasOptions
                            ? handleOpenOptions(product)
                            : addToCart(product)
                        }
                      >
                        {hasOptions ? "Options" : "Add"}
                      </Button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (LIVE CART) */}
        <div className="w-[35%] flex flex-col bg-white">
          <div className="p-4 border-b border-zinc-200 bg-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 pb-px">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-zinc-900" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
                    {cart.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                )}
              </div>
              <h2 className="text-[17px] font-black text-zinc-900">
                Order{" "}
                {activeOrder?.orderNumber ? `#${activeOrder.orderNumber}` : ""}
              </h2>
            </div>
            <button
              className="text-red-500 hover:text-red-600 text-[13px] font-bold disabled:opacity-50"
              onClick={() => setIsClearOrderModalOpen(true)}
              disabled={cart.length === 0}
            >
              Clear All
            </button>
          </div>
          <div className="flex-1 bg-zinc-50 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <p className="font-bold text-sm text-zinc-900">
                    No items added
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    Tap a menu item to begin order.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, idx) => {
                    const offerLines = isOfferItem(item)
                      ? getOfferDetailLines(item)
                      : [];
                    return (
                    <div
                      key={item.cartId || idx}
                      className="bg-white rounded-lg p-3 border border-zinc-200 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="pr-2 min-w-0">
                          <h4 className="font-bold text-zinc-900 text-sm leading-tight">
                            {isOfferItem(item) ? (
                              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded px-1 py-0.5 mr-1.5 align-middle">
                                OFFER
                              </span>
                            ) : item.productCode ? (
                              <span className="text-orange-600 mr-1.5">
                                {item.productCode}
                              </span>
                            ) : null}
                            {item.name}
                          </h4>
                          {offerLines.length > 0 ? (
                            <div className="mt-1 space-y-0.5">
                              {offerLines.map((line) => (
                                <p
                                  key={line.label}
                                  className="text-[11px] font-medium text-zinc-500"
                                >
                                  <span className="font-bold text-zinc-600">
                                    {line.label}:
                                  </span>{" "}
                                  {line.value}
                                </p>
                              ))}
                            </div>
                          ) : item.modifier ? (
                            <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                              {item.modifier}
                            </p>
                          ) : null}
                        </div>
                        <span className="font-bold text-sm text-zinc-900 shrink-0">
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              removeFromCart(item.cartId || item.id)
                            }
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-100 rounded-md p-0.5">
                          <button
                            onClick={() =>
                              updateQty(item.cartId || item.id, -1)
                            }
                            className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-zinc-700 hover:bg-zinc-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-sm w-4 text-center text-zinc-900">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.cartId || item.id, 1)}
                            className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-zinc-700 hover:bg-zinc-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {cart.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="h-px bg-zinc-200" />
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Order Notes
                    </label>
                    <textarea
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="e.g. Nut allergy..."
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none shadow-sm"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pt-3 pb-4 border-t border-zinc-200 bg-white shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>Subtotal</span>
                <span className="text-zinc-900">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>
                    Discount
                    {appliedDiscount?.code ? ` (${appliedDiscount.code})` : ""}
                  </span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>HST</span>
                <span className="text-zinc-900">${totalTax.toFixed(2)}</span>
              </div>
              {hasServiceTax && serviceChargeTotal > 0 && (
                <div className="flex justify-between text-sm font-semibold text-zinc-500">
                  <span>{serviceChargeLabel}</span>
                  <span className="text-zinc-900">
                    ${serviceChargeTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-100">
                <span className="text-base font-bold text-zinc-900">Total</span>
                <span className="text-2xl font-black text-zinc-900 leading-none">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0 || isSubmitting}
                className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-none"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Kitchen / KOT"
                )}
              </Button>
              <Button
                onClick={openPaymentModal}
                disabled={!canPay}
                className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-none disabled:opacity-50"
              >
                {orderStatus === "PAID" ? "Paid" : "Pay Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KITCHEN / PARTY NAME MODAL */}
      {isKitchenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Party Name</h2>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">
                  Whose bill is this for? Optional — leave blank to use table +
                  guests.
                </p>
              </div>
              <button
                onClick={() => setIsKitchenModalOpen(false)}
                className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer / Party Name
                  <span className="text-zinc-400 font-semibold normal-case">
                    (optional)
                  </span>
                </label>
                <Input
                  placeholder="e.g. John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-12 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
                />
                <p className="text-[12px] text-zinc-500 font-medium">
                  If empty, will use:{" "}
                  <span className="font-bold text-zinc-700">
                    {resolvePartyName("")}
                  </span>
                </p>
              </div>

              {sessionId === "new" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Table Number
                    <span className="text-zinc-400 font-semibold normal-case">
                      (if no name)
                    </span>
                  </label>
                  <Input
                    placeholder="e.g. T-01"
                    value={guestTable}
                    onChange={(e) => setGuestTable(e.target.value)}
                    className="h-12 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
                  />
                </div>
              )}

              {sessionId !== "new" && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm font-semibold text-zinc-600 space-y-1">
                  {getDisplayTableNo() && (
                    <div>
                      {" "}
                      <span className="text-zinc-900">
                        {getDisplayTableNo()}
                      </span>
                    </div>
                  )}
                  {sessionData?.guestCount != null && (
                    <div>
                      Guests:{" "}
                      <span className="text-zinc-900">
                        {sessionData.guestCount}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsKitchenModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 shadow-none bg-red-500 text-white hover:bg-red-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmKitchen}
                disabled={isSubmitting}
                className="flex-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none flex items-center justify-center"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirm & Send"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <TodayOrderPaymentModal
        key={activeOrder?._id || "session-payment"}
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        sessionId={sessionId !== "new" ? sessionId : undefined}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        redeemNote="POS Payment"
        order={
          activeOrder
            ? {
                ...activeOrder,
                subTotal: subtotal,
                taxTotal: totalTax,
                serviceChargeTotal,
                serviceChargeName: hasServiceTax ? serviceChargeLabel : null,
                discountCode:
                  appliedDiscount?.code || activeOrder.discountCode || null,
                discountTotal:
                  discountAmount || activeOrder.discountTotal || 0,
                partyName:
                  guestName ||
                  activeOrder.partyName ||
                  activeOrder.guestName ||
                  "",
                guestName:
                  guestName || activeOrder.guestName || "",
                guestCount:
                  sessionData?.guestCount ?? activeOrder.guestCount ?? null,
                tableNo:
                  activeOrder.tableNo ||
                  sessionData?.tableNumber ||
                  (sessionId === "new" ? guestTable : "") ||
                  "",
                tableSession: sessionId !== "new" ? sessionId : undefined,
              }
            : null
        }
        onPaid={(updatedOrder) => {
          setOrderStatus("PAID");
          setActiveOrder((prev) => ({ ...(prev || {}), ...updatedOrder }));
          if (updatedOrder?.discountCode) {
            setAppliedDiscount({
              code: updatedOrder.discountCode,
              value: Number(updatedOrder.discountTotal || 0),
              type: "$",
            });
          }
          setPrintOrderData(updatedOrder);
          setPrintTaxBreakdown(generateTaxBreakdown());
          setPrintType("customer");
          setRedirectAfterPrint(false);
          setIsPrintModalOpen(true);
        }}
      />

      {/* OPTIONS MODAL */}
      {isOptionsModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  {selectedProduct.productCode ? (
                    <span className="text-orange-600 mr-2">
                      {selectedProduct.productCode}
                    </span>
                  ) : null}
                  {selectedProduct.name}
                </h2>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">
                  Select variations and extras
                </p>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-100 pb-2 px-3 gap-1">
                  <div className="flex-1 min-w-[100px]">Option</div>
                  <div className="w-20 text-center">Qty</div>
                  <div className="w-14 text-center">Base</div>
                  <div className="w-16 text-center">Discount</div>
                  <div className="w-16 text-center">Tax</div>
                  {hasServiceTax && (
                    <div className="w-16 text-center">Svc</div>
                  )}
                  <div className="w-20 text-right">Total</div>
                </div>

                {selectedProduct.variants &&
                  selectedProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                        Variants
                      </span>
                      <div className="grid gap-2">
                        {selectedProduct.variants.map((v, idx) => {
                          const qty = variantQtyBySize[v.size] || 0;
                          const isChecked = qty > 0;
                          const discountAmount = calculateItemDiscount(
                            selectedProduct,
                            v.price,
                          );
                          const discountedPrice = Math.max(
                            0,
                            v.price - discountAmount,
                          );
                          const taxAmount = calculateItemTax(
                            selectedProduct,
                            discountedPrice,
                          );
                          const svcUnit = hasServiceTax
                            ? String(serviceTax.type || "")
                                .toLowerCase()
                                .includes("percent")
                              ? calculateItemServiceCharge(discountedPrice)
                              : Number(serviceTax.value) || 0
                            : 0;
                          const unitFinal =
                            discountedPrice +
                            taxAmount +
                            (String(serviceTax?.type || "")
                              .toLowerCase()
                              .includes("percent")
                              ? svcUnit
                              : 0);
                          const lineTax = taxAmount * qty;
                          const lineSvc = String(serviceTax?.type || "")
                            .toLowerCase()
                            .includes("percent")
                            ? svcUnit * qty
                            : 0;
                          const lineTotal = unitFinal * qty;

                          return (
                            <div
                              key={idx}
                              className={`flex items-center border p-3 rounded-lg transition-colors gap-1 ${
                                isChecked
                                  ? "border-orange-500 bg-orange-50/30"
                                  : "border-zinc-200"
                              }`}
                            >
                              <div
                                className={`flex-1 min-w-[100px] text-[14px] font-bold ${isChecked ? "text-zinc-900" : "text-zinc-700"}`}
                              >
                                {v.size}
                              </div>
                              <div className="w-20 flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariantQty(v.size, qty - 1)
                                  }
                                  className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
                                  aria-label={`Decrease ${v.size}`}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-5 text-center font-bold text-sm text-zinc-900">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariantQty(v.size, qty + 1)
                                  }
                                  className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
                                  aria-label={`Increase ${v.size}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="w-14 text-center font-bold text-[12px] text-zinc-900">
                                ${v.price.toFixed(2)}
                              </div>
                              <div className="w-16 text-center text-red-500 font-medium text-[12px]">
                                {discountAmount > 0
                                  ? `-$${(discountAmount * Math.max(qty, 1)).toFixed(2)}`
                                  : "-"}
                              </div>
                              <div className="w-16 text-center text-zinc-500 font-medium text-[12px]">
                                +${(qty > 0 ? lineTax : taxAmount).toFixed(2)}
                              </div>
                              {hasServiceTax && (
                                <div className="w-16 text-center text-zinc-500 font-medium text-[12px]">
                                  +$
                                  {(String(serviceTax.type || "")
                                    .toLowerCase()
                                    .includes("percent")
                                    ? qty > 0
                                      ? lineSvc
                                      : svcUnit
                                    : svcUnit
                                  ).toFixed(2)}
                                </div>
                              )}
                              <div className="w-20 text-right font-bold text-[13px] text-zinc-900">
                                $
                                {(qty > 0 ? lineTotal : unitFinal).toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {selectedProduct.preparationStyles &&
                  selectedProduct.preparationStyles.filter(Boolean).length >
                    0 && (
                    <div className="space-y-2">
                      <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                        Preparation Style
                      </span>
                      <div className="grid gap-2">
                        {selectedProduct.preparationStyles
                          .filter(Boolean)
                          .map((style) => (
                            <label
                              key={style}
                              className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedPreparationStyle === style
                                  ? "border-orange-500 bg-orange-50/30"
                                  : "border-zinc-200 hover:border-orange-300"
                              }`}
                            >
                              <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800">
                                <input
                                  type="radio"
                                  name="preparationStyle"
                                  checked={selectedPreparationStyle === style}
                                  onChange={() =>
                                    setSelectedPreparationStyle(style)
                                  }
                                  className="w-4 h-4 accent-orange-500"
                                />
                                <span>{style}</span>
                              </div>
                            </label>
                          ))}
                        <button
                          type="button"
                          onClick={() => setSelectedPreparationStyle("")}
                          className="text-left text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-1"
                        >
                          Clear style
                        </button>
                      </div>
                    </div>
                  )}

                {selectedProduct.addons &&
                  selectedProduct.addons.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-zinc-100 space-y-2">
                      <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                        Extras
                      </span>
                      <div className="grid gap-2">
                        {selectedProduct.addons.map((addon) => {
                          const qty = addonQtyById[addon._id]?.qty || 0;
                          const isChecked = qty > 0;
                          const discountAmount = calculateItemDiscount(
                            selectedProduct,
                            addon.price,
                          );
                          const discountedPrice = Math.max(
                            0,
                            addon.price - discountAmount,
                          );
                          const taxAmount = calculateItemTax(
                            selectedProduct,
                            discountedPrice,
                          );
                          const svcUnit = hasServiceTax
                            ? String(serviceTax.type || "")
                                .toLowerCase()
                                .includes("percent")
                              ? calculateItemServiceCharge(discountedPrice)
                              : Number(serviceTax.value) || 0
                            : 0;
                          const unitFinal =
                            discountedPrice +
                            taxAmount +
                            (String(serviceTax?.type || "")
                              .toLowerCase()
                              .includes("percent")
                              ? svcUnit
                              : 0);
                          const lineTax = taxAmount * qty;
                          const lineSvc = String(serviceTax?.type || "")
                            .toLowerCase()
                            .includes("percent")
                            ? svcUnit * qty
                            : 0;
                          const lineTotal = unitFinal * qty;

                          return (
                            <div
                              key={addon._id}
                              className={`flex items-center border p-3 rounded-lg transition-colors gap-1 ${
                                isChecked
                                  ? "border-orange-500 bg-orange-50/30"
                                  : "border-zinc-200"
                              }`}
                            >
                              <div
                                className={`flex-1 min-w-[100px] text-[14px] font-bold ${isChecked ? "text-zinc-900" : "text-zinc-700"}`}
                              >
                                {addon.name}
                              </div>
                              <div className="w-20 flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAddonQty(addon, qty - 1)}
                                  className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
                                  aria-label={`Decrease ${addon.name}`}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-5 text-center font-bold text-sm text-zinc-900">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAddonQty(addon, qty + 1)}
                                  className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center text-zinc-700 hover:bg-zinc-200"
                                  aria-label={`Increase ${addon.name}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="w-14 text-center font-bold text-[12px] text-zinc-900">
                                +${addon.price.toFixed(2)}
                              </div>
                              <div className="w-16 text-center text-red-500 font-medium text-[12px]">
                                {discountAmount > 0
                                  ? `-$${(discountAmount * Math.max(qty, 1)).toFixed(2)}`
                                  : "-"}
                              </div>
                              <div className="w-16 text-center text-zinc-500 font-medium text-[12px]">
                                +${(qty > 0 ? lineTax : taxAmount).toFixed(2)}
                              </div>
                              {hasServiceTax && (
                                <div className="w-16 text-center text-zinc-500 font-medium text-[12px]">
                                  +$
                                  {(String(serviceTax.type || "")
                                    .toLowerCase()
                                    .includes("percent")
                                    ? qty > 0
                                      ? lineSvc
                                      : svcUnit
                                    : svcUnit
                                  ).toFixed(2)}
                                </div>
                              )}
                              <div className="w-20 text-right font-bold text-[13px] text-zinc-900">
                                +$
                                {(qty > 0 ? lineTotal : unitFinal).toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex gap-3 shrink-0 rounded-b-2xl">
              <Button
                onClick={() => setIsOptionsModalOpen(false)}
                variant="outline"
                className="flex-1 h-12 border-zinc-300 font-bold text-zinc-700 shadow-none hover:bg-white"
              >
                Cancel
              </Button>
              <Button
                onClick={addModifiedItemToCart}
                className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ORDER CONFIRMATION MODAL */}
      {isClearOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">
              Clear Order?
            </h3>
            <p className="text-zinc-500 font-medium mb-6">
              Are you sure you want to remove all items from the current order?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 font-bold border-zinc-200"
                onClick={() => setIsClearOrderModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleClearOrder}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">Release Table?</h2>
              <p className="text-sm font-semibold text-zinc-500 mt-1">
                Payment is complete
                {sessionData?.tableNumber ? ` for ${sessionData.tableNumber}` : ""}
                {sessionData?.floorName ? ` on ${sessionData.floorName}` : ""}.
                Do you want to release this table now?
              </p>
            </div>
            <div className="p-5 flex gap-3">
              <Button
                variant="outline"
                disabled={isReleasingTable}
                onClick={() => handleReleaseTable(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                No, Go to Floor
              </Button>
              <Button
                disabled={isReleasingTable}
                onClick={() => handleReleaseTable(true)}
                className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none"
              >
                {isReleasingTable ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Release"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          if (printType === "customer" && orderStatus === "PAID") {
            if (sessionId !== "new") {
              setIsReleaseModalOpen(true);
            } else {
              goToFloor();
            }
            return;
          }
          if (redirectAfterPrint) {
            goToFloor();
          }
        }}
        printType={printType}
        order={printOrderData}
        kotItems={printKotItems}
        taxBreakdown={printTaxBreakdown}
        serverName={serverName}
        guestCount={printOrderData?.guestCount ?? sessionData?.guestCount}
      />
    </div>
  );
}
