"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
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
  DollarSign,
  Percent,
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
  CreditCard,
  Banknote,
  Gift,
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
import { useAuth } from "@/components/providers/AuthProvider";

function getCartFingerprint(items) {
  return (items || [])
    .map((item) => `${item.cartId || item.id}:${item.qty}:${item.name}:${item.size || ""}`)
    .sort()
    .join("|");
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
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedPreparationStyle, setSelectedPreparationStyle] = useState("");

  // New states
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestTable, setGuestTable] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Card"); // Card, Cash, GiftCard
  const [amountTendered, setAmountTendered] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [selectedCardType, setSelectedCardType] = useState("");
  const [cardAmountTendered, setCardAmountTendered] = useState("");

  // Split payment / Gift card states
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [giftCardDetails, setGiftCardDetails] = useState(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState(null);
  const [giftCardError, setGiftCardError] = useState("");
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);
  const [giftCardSplitAmount, setGiftCardSplitAmount] = useState(0);

  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState("customer"); // 'customer' | 'kot'
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
        const [catRes, prodRes, taxRes, headRes, phRes, offerRes] =
          await Promise.all([
            fetch("/api/menu/categories"),
            fetch("/api/menu/products"),
            fetch("/api/tax"),
            fetch("/api/menu/heads"),
            fetch("/api/menu/product-heads"),
            fetch("/api/menu/offers"),
          ]);
        const catJson = await catRes.json();
        const prodJson = await prodRes.json();
        const taxJson = await taxRes.json();
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
              const parts = [];
              if (item.size && item.size !== "Standard")
                parts.push(`Size: ${item.size}`);
              if (style) parts.push(`${style}`);
              if (extras.length > 0) parts.push(`Extras: ${extras.join(", ")}`);
              return {
                id: item.menuItemId,
                name: item.name,
                productCode: item.productCode || "",
                category: item.category || "ITEMS",
                price: item.price,
                tax: item.tax,
                qty: item.qty,
                size: item.size,
                sizes:
                  item.sizes ||
                  (item.size && item.size !== "Standard"
                    ? String(item.size).split(", ").filter(Boolean)
                    : []),
                preparationStyle: style,
                options: item.options || [],
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

  useEffect(() => {
    if (!isPaymentModalOpen) return;
    const loadDiscounts = async () => {
      try {
        const res = await fetch("/api/orders/discount");
        const json = await res.json();
        if (json.success) setAvailableDiscounts(json.data || []);
      } catch (err) {
        setAvailableDiscounts([]);
      }
    };
    loadDiscounts();
  }, [isPaymentModalOpen]);

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
    return (
      offer.name?.toLowerCase().includes(q) ||
      offer.description?.toLowerCase().includes(q)
    );
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
    setSelectedSizes(
      item.variants && item.variants.length > 0 ? [item.variants[0].size] : [],
    );
    setSelectedAddons([]);
    const styles = (item.preparationStyles || []).filter(Boolean);
    setSelectedPreparationStyle(styles.length === 1 ? styles[0] : "");
    setIsOptionsModalOpen(true);
  };

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a._id === addon._id);
      if (exists) return prev.filter((a) => a._id !== addon._id);
      return [...prev, addon];
    });
  };

  const toggleVariant = (size) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) return prev.filter((s) => s !== size);
      return [...prev, size];
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
          qty: 1,
          size: "Standard",
          sizes: [],
          preparationStyle: null,
          options: [],
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
    const extras = [];
    if (offer.inclusions?.length) {
      extras.push(`Includes: ${offer.inclusions.join(", ")}`);
    }
    if (offer.choices?.length) {
      extras.push(`Choices: ${offer.choices.join(", ")}`);
    }
    if (offer.drinks?.length) {
      extras.push(`Drinks: ${offer.drinks.join(", ")}`);
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === offer._id && item.category === "Offer",
      );
      if (existing) {
        return prev.map((item) =>
          item.id === offer._id && item.category === "Offer"
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
          category: "Offer",
          price,
          tax: itemTax,
          qty: 1,
          size: "Standard",
          sizes: [],
          preparationStyle: null,
          options: extras,
          modifier: extras.length ? extras.join(" • ") : null,
          cartId: Date.now(),
          isOffer: true,
        },
      ];
    });
    toast.success(`${offer.name} added`);
  };

  const addModifiedItemToCart = () => {
    if (!selectedProduct) return;

    const hasVariants =
      selectedProduct.variants && selectedProduct.variants.length > 0;
    if (hasVariants && selectedSizes.length === 0) {
      toast.error("Select at least one variant");
      return;
    }

    let basePrice = selectedProduct.price || 0;
    if (hasVariants) {
      basePrice = selectedProduct.variants
        .filter((v) => selectedSizes.includes(v.size))
        .reduce((sum, v) => sum + (Number(v.price) || 0), 0);
    }

    const addonsPrice = selectedAddons.reduce(
      (sum, a) => sum + (a.price || 0),
      0,
    );
    const finalPrice = basePrice + addonsPrice;

    const finalTax = calculateItemTax(selectedProduct, finalPrice);

    const options = [];
    if (selectedPreparationStyle) {
      options.push(`${selectedPreparationStyle}`);
    }
    selectedAddons.forEach((a) => options.push(a.name));

    const sizeLabel = formatSizeLabel(selectedSizes);
    const parts = [];
    if (sizeLabel && sizeLabel !== "Standard") parts.push(`Size: ${sizeLabel}`);
    if (selectedPreparationStyle)
      parts.push(`${selectedPreparationStyle}`);
    if (selectedAddons.length > 0) {
      parts.push(`Extras: ${selectedAddons.map((a) => a.name).join(", ")}`);
    }

    setCart((prev) => [
      ...prev,
      {
        id: selectedProduct._id,
        cartId: Date.now(),
        name: selectedProduct.name,
        productCode: selectedProduct.productCode || "",
        category: selectedProduct.category?.name || "ITEMS",
        price: finalPrice,
        tax: finalTax,
        qty: 1,
        size: sizeLabel,
        sizes: selectedSizes,
        preparationStyle: selectedPreparationStyle || null,
        options,
        modifier: parts.length > 0 ? parts.join(" | ") : undefined,
      },
    ]);
    setIsOptionsModalOpen(false);
    setSelectedPreparationStyle("");
    setSelectedSizes([]);
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
        toast.success("Order sent to kitchen!");
        setIsKitchenModalOpen(false);
        setGuestName(partyName);
        setActiveOrder(json.data);
        setOrderStatus("PENDING");
        setKotCartFingerprint(getCartFingerprint(cart));

        // Check if there are items to print for KOT
        if (json.data.kotPayload && json.data.kotPayload.length > 0) {
          setPrintOrderData({
            ...json.data,
            partyName,
            guestName: partyName,
            guestCount: sessionData?.guestCount ?? json.data.guestCount ?? null,
          });
          setPrintKotItems(json.data.kotPayload);
          setPrintType("kot");
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

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Enter a discount code.");
      return;
    }
    try {
      const res = await fetch("/api/orders/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode }),
      });
      const json = await res.json();
      if (json.success) {
        setAppliedDiscount({
          code: json.data.code,
          value: json.data.value,
          type: json.data.discountType === "percent" ? "%" : "$",
        });
        toast.success("Discount applied!");
      } else {
        toast.error(json.message || "Invalid discount code");
        setAppliedDiscount(null);
      }
    } catch (err) {
      toast.error("Failed to apply discount");
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const formatDiscountOption = (coupon) => {
    const amount =
      coupon.discountType === "percent"
        ? `${coupon.value}%`
        : `$${Number(coupon.value).toFixed(2)}`;
    return `${coupon.code} — ${amount}`;
  };

  const verifyGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    const normalizedCode = giftCardCode.trim().toUpperCase();
    setGiftCardCode(normalizedCode);
    setIsVerifyingGiftCard(true);
    setGiftCardError("");
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    try {
      const res = await fetch(
        `/api/menu/giftcards?code=${encodeURIComponent(normalizedCode)}`,
      );
      const json = await res.json();
      if (json.success) {
        setGiftCardDetails(json.data);
        setIsGiftCardModalOpen(true);
      } else {
        setGiftCardError(
          json.message || "Only issued active gift cards can be used",
        );
      }
    } catch (err) {
      setGiftCardError("Failed to verify Gift Card");
    } finally {
      setIsVerifyingGiftCard(false);
    }
  };

  const handleApplyGiftCard = () => {
    const actualBalance = giftCardDetails.balance ?? giftCardDetails.value;
    setGiftCardBalance(actualBalance);
    if (actualBalance < total) {
      setGiftCardSplitAmount(Math.round((total - actualBalance) * 100) / 100);
    } else {
      setGiftCardSplitAmount(0);
      setAmountTendered("");
      setCardAmountTendered("");
    }
    setIsGiftCardModalOpen(false);
  };

  const handleRemoveGiftCard = () => {
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    setGiftCardCode("");
    setGiftCardError("");
    setGiftCardSplitAmount(0);
    setIsGiftCardModalOpen(false);
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
  const total = subtotal - discountAmount + totalTax;
  const cardDue = giftCardBalance !== null ? giftCardSplitAmount : total;
  const parsedCardAmount =
    cardAmountTendered === "" ? NaN : parseFloat(cardAmountTendered);
  const cardPayAmount = Number.isFinite(parsedCardAmount)
    ? parsedCardAmount
    : cardDue;
  const cashSplitAmount =
    paymentMethod === "Card" && cardPayAmount < cardDue
      ? Math.round((cardDue - cardPayAmount) * 100) / 100
      : 0;
  // Keep gift-card split in sync when discount changes the total due
  useEffect(() => {
    if (giftCardBalance === null) return;
    if (giftCardBalance < total) {
      setGiftCardSplitAmount(Math.round((total - giftCardBalance) * 100) / 100);
    } else {
      setGiftCardSplitAmount(0);
    }
  }, [total, giftCardBalance]);

  const hasSentKot =
    Boolean(activeOrder) &&
    orderStatus !== "Draft" &&
    kotCartFingerprint === getCartFingerprint(cart);
  const canPay =
    hasSentKot && cart.length > 0 && orderStatus !== "PAID";

  const openPaymentModal = () => {
    if (orderStatus === "PAID") return;
    if (!hasSentKot) {
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

  const handlePayment = async () => {
    if (cart.length === 0) return;
    if (!hasSentKot || !activeOrder) {
      toast.error("Send the order to kitchen (KOT) before taking payment.");
      return;
    }
    try {
      setIsSubmitting(true);
      const currentOrder = activeOrder;

      // Proceed with Payment
      const giftCardUsedAmount =
        giftCardBalance !== null
          ? Math.round((total - giftCardSplitAmount) * 100) / 100
          : 0;
      const partyName = resolvePartyName();

      const paymentPayload = {
        orderId: currentOrder._id,
        amount: total,
        method: paymentMethod,
        sessionId: sessionId !== "new" ? sessionId : undefined,
        tipAmount: tipAmount,
        discountTotal: discountAmount,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        guestName: partyName,
        partyName,
        guestCount: sessionData?.guestCount ?? null,
      };

      if (paymentMethod === "Card") {
        paymentPayload.cardType = selectedCardType;
        paymentPayload.cardAmount = Math.min(cardPayAmount, cardDue);
        if (cashSplitAmount > 0) {
          paymentPayload.method = "Card + Cash";
          paymentPayload.cashAmount = cashSplitAmount;
        }
      }

      if (giftCardBalance !== null) {
        paymentPayload.giftCardCode = giftCardCode.trim().toUpperCase();
        paymentPayload.splitAmount = giftCardSplitAmount;
      }

      const res = await fetch("/api/sales/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      });
      const json = await res.json();
      if (json.success) {
        if (giftCardBalance !== null && giftCardCode) {
          const amountToUse = giftCardUsedAmount;
          await fetch("/api/menu/giftcards/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: giftCardCode.trim().toUpperCase(),
              amountToUse: amountToUse,
              orderId: currentOrder.orderNumber || currentOrder._id,
              note: "POS Payment",
            }),
          });
        }

        toast.success("Payment collected successfully!");
        setOrderStatus("PAID");
        setIsPaymentModalOpen(false);

        // Update current order with payment details so the receipt prints correctly
        const updatedOrder = {
          ...currentOrder,
          ...(json.data || {}),
          paymentStatus: "PAID",
          paymentMethod:
            paymentMethod === "Card" && cashSplitAmount > 0
              ? selectedCardType
                ? `Card - ${selectedCardType} + Cash`
                : "Card + Cash"
              : paymentMethod === "Card" && selectedCardType
                ? `Card - ${selectedCardType}`
                : paymentMethod,
          tipAmount: tipAmount,
          discountTotal: discountAmount,
          discountCode: appliedDiscount ? appliedDiscount.code : null,
          totalAmount: total,
          subTotal: subtotal,
          taxTotal: totalTax,
          giftcardCode:
            giftCardBalance !== null ? giftCardCode.trim().toUpperCase() : null,
          giftcardUsedAmount: giftCardUsedAmount,
          guestName: partyName,
          partyName,
          guestCount: sessionData?.guestCount ?? null,
        };

        // Open Customer Receipt Print Preview
        setPrintOrderData(updatedOrder);
        setPrintTaxBreakdown(generateTaxBreakdown());
        setPrintType("customer");
        setRedirectAfterPrint(false);
        setIsPrintModalOpen(true);
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("Failed to process payment.");
    } finally {
      setIsSubmitting(false);
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
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-zinc-50 font-sans overflow-hidden border border-zinc-200 rounded-xl shadow-sm">
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
                    const detailBits = [
                      ...(offer.inclusions || []).slice(0, 2),
                      ...(offer.choices || []).slice(0, 1),
                    ].filter(Boolean);

                    return (
                      <div
                        key={offer._id}
                        className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md min-h-[76px]"
                      >
                        <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 shrink-0">
                              OFFER
                            </span>
                            <span className="font-bold text-zinc-900 text-xs md:text-sm">
                              {offer.name}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {offer.description ? (
                              <span className="text-xs font-medium text-zinc-500 line-clamp-2">
                                {offer.description}
                              </span>
                            ) : null}
                            {detailBits.length > 0 ? (
                              <span className="text-xs font-semibold text-zinc-400 truncate">
                                {detailBits.join(" · ")}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-zinc-500">
                                Offer
                              </span>
                            )}
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
                            {taxAmount > 0 ? (
                              <span className="text-[10px] text-zinc-400">
                                +${taxAmount.toFixed(2)} tax
                              </span>
                            ) : null}
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
                  {cart.map((item, idx) => (
                    <div
                      key={item.cartId || idx}
                      className="bg-white rounded-lg p-3 border border-zinc-200 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <h4 className="font-bold text-zinc-900 text-sm leading-tight">
                            {item.productCode ? (
                              <span className="text-orange-600 mr-1.5">
                                {item.productCode}
                              </span>
                            ) : null}
                            {item.name}
                          </h4>
                          {item.modifier && (
                            <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                              {item.modifier}
                            </p>
                          )}
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
                  ))}
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
                <span>Tax</span>
                <span className="text-zinc-900">${totalTax.toFixed(2)}</span>
              </div>
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
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
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

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                PAYMENT
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
                aria-label="Close payment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: two columns on tablet+ */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 min-h-full">
                {/* LEFT — Order Summary + Discount */}
                <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-zinc-100 bg-zinc-50/60 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                      Order Summary
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activeOrder?.orderNumber && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800">
                          Order #{activeOrder.orderNumber}
                        </span>
                      )}
                      {(activeOrder?.tableNo ||
                        sessionData?.tableNumber ||
                        (sessionId === "new" && guestTable)) && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800">
                          {" "}
                          {activeOrder?.tableNo ||
                            sessionData?.tableNumber ||
                            guestTable}
                        </span>
                      )}
                      {sessionData?.guestCount != null && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800">
                          {sessionData.guestCount} guest
                          {sessionData.guestCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Party / Customer Name
                        <span className="text-zinc-400 font-semibold normal-case">
                          (optional)
                        </span>
                      </label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="h-11 bg-white border-zinc-200 rounded-xl text-sm font-semibold focus-visible:ring-orange-500"
                      />
                    </div>

                    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 shadow-sm">
                      <div className="flex justify-between text-sm font-semibold text-zinc-500">
                        <span>Subtotal</span>
                        <span className="text-zinc-900">
                          ${subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-zinc-500">
                        <span>Tax</span>
                        <span className="text-zinc-900">
                          ${totalTax.toFixed(2)}
                        </span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-green-600">
                          <span>
                            Discount
                            {appliedDiscount?.code
                              ? ` (${appliedDiscount.code})`
                              : ""}
                          </span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-zinc-200 my-1" />
                      <div className="flex justify-between items-end pt-1">
                        <span className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                          Total Due
                        </span>
                        <span className="text-3xl font-black text-zinc-900 leading-none">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Apply Discount
                    </p>
                    {appliedDiscount ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-green-900 truncate">
                                {appliedDiscount.code}
                              </p>
                              <p className="text-sm font-bold text-green-700">
                                -${discountAmount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveDiscount}
                            className="h-10 px-4 rounded-lg bg-red-500 border-red-200 text-white hover:bg-red-600 font-bold text-sm shadow-none shrink-0"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={discountCode || undefined}
                          onValueChange={(value) => setDiscountCode(value)}
                        >
                          <SelectTrigger className="w-full h-12 bg-white border-zinc-200 rounded-xl font-semibold text-sm focus:ring-orange-500">
                            <SelectValue placeholder="Select a discount..." />
                          </SelectTrigger>
                          <SelectContent className="z-[80]">
                            {availableDiscounts.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                No active discounts
                              </SelectItem>
                            ) : (
                              availableDiscounts.map((coupon) => (
                                <SelectItem key={coupon._id || coupon.code} value={coupon.code}>
                                  {formatDiscountOption(coupon)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="text"
                              value={discountCode}
                              onChange={(e) =>
                                setDiscountCode(e.target.value.toUpperCase())
                              }
                              placeholder="Or enter discount code..."
                              className="w-full h-12 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleApplyDiscount}
                            disabled={!discountCode.trim()}
                            className="h-12 px-5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Split payment breakdown */}
                  {(giftCardBalance !== null || cashSplitAmount > 0) && (
                    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2 shadow-sm">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Payment Breakdown
                      </p>
                      {giftCardBalance !== null && (
                        <div className="flex justify-between text-sm font-semibold text-zinc-600">
                          <span>Gift Card</span>
                          <span className="text-zinc-900">
                            $
                            {Math.max(
                              0,
                              Math.round((total - giftCardSplitAmount) * 100) /
                                100,
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {paymentMethod === "Card" && (
                        <div className="flex justify-between text-sm font-semibold text-zinc-600">
                          <span>Card</span>
                          <span className="text-zinc-900">
                            ${Math.min(cardPayAmount, cardDue).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {cashSplitAmount > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-zinc-600">
                          <span>Cash</span>
                          <span className="text-zinc-900">
                            ${cashSplitAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {giftCardBalance !== null &&
                        giftCardSplitAmount > 0 &&
                        paymentMethod !== "Card" && (
                        <div className="flex justify-between text-sm font-semibold text-zinc-600">
                          <span>
                            {paymentMethod === "Cash" ? "Cash" : "Remaining"}
                          </span>
                          <span className="text-zinc-900">
                            ${giftCardSplitAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="h-px bg-zinc-200" />
                      <div className="flex justify-between text-sm font-black text-zinc-900">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT — Payment Method */}
                <div className="p-5 md:p-6 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                      Payment Method
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { key: "Card", label: "Card", Icon: CreditCard },
                        { key: "Cash", label: "Cash", Icon: Banknote },
                        { key: "GiftCard", label: "Gift Card", Icon: Gift },
                      ].map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaymentMethod(key)}
                          className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border-2 transition-all ${
                            paymentMethod === key
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <Icon className="w-6 h-6" strokeWidth={2} />
                          <span className="text-xs font-black uppercase tracking-wide">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CARD */}
                  {paymentMethod === "Card" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        Card Payment
                      </h3>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Apply Gift Card (Optional)
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="text"
                              value={giftCardCode}
                              onChange={(e) => setGiftCardCode(e.target.value)}
                              placeholder="Enter code..."
                              disabled={giftCardBalance !== null}
                              className="w-full h-12 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase disabled:bg-zinc-50 disabled:text-zinc-500"
                            />
                          </div>
                          {giftCardBalance !== null ? (
                            <Button
                              type="button"
                              onClick={handleRemoveGiftCard}
                              className="h-12 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-none"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              onClick={verifyGiftCard}
                              disabled={!giftCardCode || isVerifyingGiftCard}
                              className="h-12 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none"
                            >
                              {isVerifyingGiftCard ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                        {giftCardError && (
                          <p className="text-xs font-bold text-red-500">
                            {giftCardError}
                          </p>
                        )}
                      </div>

                      {giftCardBalance !== null && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-green-900">
                              Gift Card Applied
                            </span>
                            <span className="font-black text-green-700">
                              $
                              {Math.max(
                                0,
                                Math.round(
                                  (total - giftCardSplitAmount) * 100,
                                ) / 100,
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                            <span className="font-bold text-orange-600">
                              Remaining Due (Card)
                            </span>
                            <span className="font-black text-orange-600">
                              ${giftCardSplitAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedCardType &&
                        cardAmountTendered &&
                        parseFloat(cardAmountTendered) >
                          (giftCardBalance !== null
                            ? giftCardSplitAmount
                            : total) && (
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-orange-900">
                                Overpayment / Tip
                              </span>
                              <span className="text-xl font-black text-orange-600">
                                $
                                {(
                                  parseFloat(cardAmountTendered) -
                                  (giftCardBalance !== null
                                    ? giftCardSplitAmount
                                    : total)
                                ).toFixed(2)}
                              </span>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
                              <div
                                className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${tipAmount > 0 ? "bg-orange-500 border-orange-500" : "bg-white border-zinc-300 group-hover:border-orange-400"}`}
                              >
                                {tipAmount > 0 && (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={tipAmount > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTipAmount(
                                      Math.round(
                                        (parseFloat(cardAmountTendered) -
                                          (giftCardBalance !== null
                                            ? giftCardSplitAmount
                                            : total)) *
                                          100,
                                      ) / 100,
                                    );
                                  } else {
                                    setTipAmount(0);
                                  }
                                }}
                              />
                              <span className="text-sm font-bold text-orange-900">
                                Keep as Tip
                              </span>
                            </label>
                          </div>
                        )}

                      {(giftCardBalance === null ||
                        giftCardSplitAmount > 0) && (
                        <>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                              Select Card Type
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { name: "Visa", image: "/card/visa.png" },
                                {
                                  name: "Mastercard",
                                  image: "/card/mastercard.webp",
                                },
                                { name: "RuPay", image: "/card/rupay.webp" },
                                {
                                  name: "Amex",
                                  image: "/card/american-express.webp",
                                },
                                {
                                  name: "Discover",
                                  image: "/card/discover.png",
                                },
                              ].map((card) => (
                                <button
                                  key={card.name}
                                  type="button"
                                  onClick={() => setSelectedCardType(card.name)}
                                  className={`flex flex-col items-center justify-center min-h-[64px] p-2 rounded-xl border-2 transition-all ${
                                    selectedCardType === card.name
                                      ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                                      : "border-zinc-200 bg-white hover:border-orange-300"
                                  }`}
                                >
                                  <div className="relative w-10 h-6 mb-1">
                                    <Image
                                      src={card.image}
                                      alt={card.name}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-zinc-600 text-center leading-tight">
                                    {card.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedCardType && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                  Amount on Card
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                  <input
                                    type="number"
                                    min="0"
                                    value={cardAmountTendered}
                                    onChange={(e) =>
                                      setCardAmountTendered(e.target.value)
                                    }
                                    placeholder={cardDue.toFixed(2)}
                                    className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                              </div>

                              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    Amount in Cash
                                  </span>
                                  <span className="text-xl font-black text-zinc-900">
                                    ${cashSplitAmount.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-500">
                                  Want to Pay By Cash? Enter the remaning amount to collect via cash.
                                </p>
                                {cashSplitAmount > 0 && (
                                  <>
                                    <div className="space-y-2">
                                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                        Cash Tendered
                                      </label>
                                      <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                        <input
                                          type="number"
                                          min="0"
                                          value={amountTendered}
                                          onChange={(e) =>
                                            setAmountTendered(e.target.value)
                                          }
                                          placeholder={cashSplitAmount.toFixed(2)}
                                          className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                      </div>
                                    </div>
                                    {parseFloat(amountTendered) >
                                      cashSplitAmount && (
                                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-bold text-orange-900">
                                            Change Due
                                          </span>
                                          <span className="text-xl font-black text-orange-600">
                                            $
                                            {(
                                              parseFloat(amountTendered) -
                                              cashSplitAmount
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* CASH */}
                  {paymentMethod === "Cash" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        Cash Payment
                      </h3>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Apply Gift Card (Optional)
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="text"
                              value={giftCardCode}
                              onChange={(e) => setGiftCardCode(e.target.value)}
                              placeholder="Enter code..."
                              disabled={giftCardBalance !== null}
                              className="w-full h-12 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase disabled:bg-zinc-50 disabled:text-zinc-500"
                            />
                          </div>
                          {giftCardBalance !== null ? (
                            <Button
                              type="button"
                              onClick={handleRemoveGiftCard}
                              className="h-12 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-none"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              onClick={verifyGiftCard}
                              disabled={!giftCardCode || isVerifyingGiftCard}
                              className="h-12 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none"
                            >
                              {isVerifyingGiftCard ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                        {giftCardError && (
                          <p className="text-xs font-bold text-red-500">
                            {giftCardError}
                          </p>
                        )}
                      </div>

                      {giftCardBalance !== null && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-green-900">
                              Gift Card Applied
                            </span>
                            <span className="font-black text-green-700">
                              $
                              {Math.max(
                                0,
                                Math.round(
                                  (total - giftCardSplitAmount) * 100,
                                ) / 100,
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                            <span className="font-bold text-orange-600">
                              Remaining Due (Cash)
                            </span>
                            <span className="font-black text-orange-600">
                              ${giftCardSplitAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {(giftCardBalance === null ||
                        giftCardSplitAmount > 0) && (
                        <>
                          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex justify-between items-center">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                              Amount Due
                            </span>
                            <span className="text-2xl font-black text-zinc-900">
                              $
                              {(giftCardBalance !== null
                                ? giftCardSplitAmount
                                : total
                              ).toFixed(2)}
                            </span>
                          </div>

                              {parseFloat(amountTendered) >
                                (giftCardBalance !== null
                                  ? giftCardSplitAmount
                                  : total) && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-bold text-orange-900">
                                      Change Due
                                    </span>
                                    <span className="text-xl font-black text-orange-600">
                                      $
                                      {(
                                        parseFloat(amountTendered) -
                                        (giftCardBalance !== null
                                          ? giftCardSplitAmount
                                          : total)
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <label className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
                                    <div
                                      className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${tipAmount > 0 ? "bg-orange-500 border-orange-500" : "bg-white border-zinc-300 group-hover:border-orange-400"}`}
                                    >
                                      {tipAmount > 0 && (
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      )}
                                    </div>
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={tipAmount > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTipAmount(
                                            Math.round(
                                              (parseFloat(amountTendered) -
                                                (giftCardBalance !== null
                                                  ? giftCardSplitAmount
                                                  : total)) *
                                                100,
                                            ) / 100,
                                          );
                                        } else {
                                          setTipAmount(0);
                                        }
                                      }}
                                    />
                                    <span className="text-sm font-bold text-orange-900">
                                      Keep as Tip
                                    </span>
                                  </label>
                                </div>
                              )}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                              Amount Tendered
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                              <input
                                type="number"
                                min="0"
                                value={amountTendered}
                                onChange={(e) =>
                                  setAmountTendered(e.target.value)
                                }
                                placeholder="0.00"
                                className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                        </>
                      )}
                    </div>
                  )}

                  {/* GIFT CARD */}
                  {paymentMethod === "GiftCard" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        Gift Card Payment
                      </h3>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Gift Card Code
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="text"
                              value={giftCardCode}
                              onChange={(e) => setGiftCardCode(e.target.value)}
                              placeholder="Enter code..."
                              disabled={giftCardBalance !== null}
                              className="w-full h-12 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase disabled:bg-zinc-50 disabled:text-zinc-500"
                            />
                          </div>
                          {giftCardBalance !== null ? (
                            <Button
                              type="button"
                              onClick={handleRemoveGiftCard}
                              className="h-12 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-none"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              onClick={verifyGiftCard}
                              disabled={!giftCardCode || isVerifyingGiftCard}
                              className="h-12 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none"
                            >
                              {isVerifyingGiftCard ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                        {giftCardError && (
                          <p className="text-xs font-bold text-red-500">
                            {giftCardError}
                          </p>
                        )}
                      </div>

                      {giftCardBalance !== null && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-green-900">
                              Available Balance
                            </span>
                            <span className="font-black text-green-700">
                              ${giftCardBalance.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-green-900">
                              Amount Applied
                            </span>
                            <span className="font-black text-green-700">
                              $
                              {Math.max(
                                0,
                                Math.round(
                                  (total - giftCardSplitAmount) * 100,
                                ) / 100,
                              ).toFixed(2)}
                            </span>
                          </div>
                          {giftCardSplitAmount > 0 ? (
                            <>
                              <div className="h-px bg-green-200/80" />
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-zinc-700">
                                  Order Total
                                </span>
                                <span className="font-black text-zinc-900">
                                  ${total.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-orange-600">
                                  Remaining Due
                                </span>
                                <span className="font-black text-orange-600">
                                  ${giftCardSplitAmount.toFixed(2)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod("Cash")}
                                  className="min-h-[48px] rounded-xl border-2 border-zinc-200 bg-white font-bold text-sm text-zinc-800 hover:border-orange-400 hover:bg-orange-50"
                                >
                                  Pay Remaining Cash
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod("Card")}
                                  className="min-h-[48px] rounded-xl border-2 border-zinc-200 bg-white font-bold text-sm text-zinc-800 hover:border-orange-400 hover:bg-orange-50"
                                >
                                  Pay Remaining Card
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                              <span className="font-bold text-green-900">
                                Remaining Balance After
                              </span>
                              <span className="font-bold text-green-700">
                                ${(giftCardBalance - total).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-zinc-100 flex gap-3 shrink-0 bg-white">
              <Button
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 h-14 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none hover:bg-zinc-50 text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={
                  isSubmitting ||
                  (paymentMethod === "Cash" &&
                    giftCardSplitAmount > 0 &&
                    (!amountTendered ||
                      parseFloat(amountTendered) < giftCardSplitAmount)) ||
                  (paymentMethod === "Cash" &&
                    giftCardBalance === null &&
                    (!amountTendered || parseFloat(amountTendered) < total)) ||
                  (paymentMethod === "GiftCard" && giftCardBalance === null) ||
                  (paymentMethod === "Card" &&
                    (giftCardBalance === null || giftCardSplitAmount > 0) &&
                    cardPayAmount > 0 &&
                    !selectedCardType) ||
                  (paymentMethod === "Card" &&
                    cashSplitAmount > 0 &&
                    (!amountTendered ||
                      parseFloat(amountTendered) < cashSplitAmount))
                }
                className="flex-[1.4] h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none text-base"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Complete Payment"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GIFTCARD VERIFICATION MODAL */}
      {isGiftCardModalOpen && giftCardDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] custom-scrollbar">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">
                Gift Card Details
              </h2>
              <button
                onClick={() => setIsGiftCardModalOpen(false)}
                className="w-8 h-8 rounded border border-zinc-700 bg-red-500 text-white flex items-center justify-center hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Code
                  </p>
                  <p className="font-mono text-zinc-900">
                    {giftCardDetails.code}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Balance
                  </p>
                  <p className="font-bold text-green-600">
                    $
                    {(
                      giftCardDetails.balance ?? giftCardDetails.value
                    )?.toFixed(2)}
                  </p>
                </div>
                {giftCardDetails.name && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Card Name
                    </p>
                    <p className="font-semibold text-zinc-900">
                      {giftCardDetails.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Original Value
                  </p>
                  <p className="font-semibold text-zinc-900">
                    ${Number(giftCardDetails.value || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Status
                  </p>
                  <p className="font-semibold text-zinc-900">
                    {giftCardDetails.status || "Active"}
                    {giftCardDetails.isIssued ? " · Issued" : ""}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-zinc-900">Issued To</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Name
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {giftCardDetails.recipientName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 break-all">
                      {giftCardDetails.recipientEmail || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Phone
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {giftCardDetails.recipientPhone || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Issue Date
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {giftCardDetails.issueDate
                        ? new Date(
                            giftCardDetails.issueDate,
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  {(giftCardDetails.validFrom ||
                    giftCardDetails.validUntil) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-zinc-500 uppercase">
                        Valid Period
                      </p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {giftCardDetails.validFrom
                          ? new Date(
                              giftCardDetails.validFrom,
                            ).toLocaleDateString()
                          : "—"}
                        {" → "}
                        {giftCardDetails.validUntil
                          ? new Date(
                              giftCardDetails.validUntil,
                            ).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">
                  Usage History
                </h3>
                {giftCardDetails.history &&
                giftCardDetails.history.length > 0 ? (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 text-xs text-zinc-500 font-bold uppercase">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Used</th>
                          <th className="px-3 py-2">Balance</th>
                          <th className="px-3 py-2">Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {giftCardDetails.history.map((h, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-zinc-600">
                              {new Date(h.usedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-red-600">
                              -${h.amountUsed?.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              ${h.balanceAfter?.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-zinc-600 text-xs">
                              {h.orderId || h.note || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    No previous usage history.
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsGiftCardModalOpen(false)}
                className="flex-1 font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                No, Cancel
              </Button>
              <Button
                onClick={handleApplyGiftCard}
                className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none"
              >
                Yes, Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONS MODAL */}
      {isOptionsModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
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
                <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-100 pb-2 px-3">
                  <div className="flex-1">Option</div>
                  <div className="w-16 text-center">Base</div>
                  <div className="w-20 text-center">Discount</div>
                  <div className="w-20 text-center">Tax</div>
                  <div className="w-24 text-right">Final Price</div>
                </div>

                {selectedProduct.variants &&
                  selectedProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                        Variants
                      </span>
                      <div className="grid gap-2">
                        {selectedProduct.variants.map((v, idx) => {
                          const isChecked = selectedSizes.includes(v.size);
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
                          const finalPrice = discountedPrice + taxAmount;

                          return (
                            <label
                              key={idx}
                              className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors group ${
                                isChecked
                                  ? "border-orange-500 bg-orange-50/30"
                                  : "border-zinc-200 hover:border-orange-300"
                              }`}
                            >
                              <div
                                className={`flex-1 flex items-center gap-3 text-[14px] font-bold ${isChecked ? "text-zinc-900" : "text-zinc-700 group-hover:text-zinc-900"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleVariant(v.size)}
                                  className="w-4 h-4 accent-orange-500 rounded"
                                />
                                <span>{v.size}</span>
                              </div>
                              <div className="w-16 text-center font-bold text-[13px] text-zinc-900">
                                ${v.price.toFixed(2)}
                              </div>
                              <div className="w-20 text-center text-red-500 font-medium text-[13px]">
                                {discountAmount > 0
                                  ? `-$${discountAmount.toFixed(2)}`
                                  : "-"}
                              </div>
                              <div className="w-20 text-center text-zinc-500 font-medium text-[13px]">
                                +${taxAmount.toFixed(2)}
                              </div>
                              <div className="w-24 text-right font-bold text-[14px] text-zinc-900">
                                ${finalPrice.toFixed(2)}
                              </div>
                            </label>
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
                          const isChecked = selectedAddons.some(
                            (a) => a._id === addon._id,
                          );
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
                          const finalPrice = discountedPrice + taxAmount;

                          return (
                            <label
                              key={addon._id}
                              className="flex items-center border border-zinc-200 p-3 rounded-lg cursor-pointer hover:border-orange-300 transition-colors group"
                            >
                              <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleAddon(addon)}
                                  className="w-4 h-4 accent-orange-500 rounded"
                                />
                                <span>{addon.name}</span>
                              </div>
                              <div className="w-16 text-center font-bold text-[13px] text-zinc-900">
                                +${addon.price.toFixed(2)}
                              </div>
                              <div className="w-20 text-center text-red-500 font-medium text-[13px]">
                                {discountAmount > 0
                                  ? `-$${discountAmount.toFixed(2)}`
                                  : "-"}
                              </div>
                              <div className="w-20 text-center text-zinc-500 font-medium text-[13px]">
                                +${taxAmount.toFixed(2)}
                              </div>
                              <div className="w-24 text-right font-bold text-[14px] text-zinc-900">
                                +${finalPrice.toFixed(2)}
                              </div>
                            </label>
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
