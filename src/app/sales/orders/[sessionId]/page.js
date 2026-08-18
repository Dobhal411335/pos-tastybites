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
  Mail,
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
import StaffOrderPartyModal from "@/components/sales/StaffOrderPartyModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { buildStaffDiscountState } from "@/lib/orders/staffDiscount";
import { formatTableLocation, resolveDocumentId } from "@/utils/orderDisplay";
import { countryCodes } from "@/utils/countryCodes";
import {
  OFFER_CATEGORY,
  isOfferItem,
  cleanOfferList,
  buildOfferOptions,
  offerNeedsOptions,
  buildOfferCartModifier,
} from "@/utils/offerDetails";
import {
  productHasChoiceOptions,
  normalizeChoiceOptions,
  normalizeChoiceSelections,
  cartChoiceSelectionsKey,
} from "@/utils/productChoices";

function formatOrderServerName(order, fallbackUser) {
  if (order?.processedByName) return order.processedByName;
  const processed = order?.processedBy;
  if (processed && typeof processed === "object") {
    const name =
      processed.name ||
      [processed.firstName, processed.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
  }
  if (fallbackUser) {
    const fName = fallbackUser.firstName || "";
    const lName = fallbackUser.lastName || "";
    return fallbackUser.name || `${fName} ${lName}`.trim() || "Server";
  }
  return "Server";
}

function persistSalesFloorId(floorId) {
  const id = resolveDocumentId(floorId);
  if (!id) return null;
  try {
    window.localStorage.setItem("sales-active-floor-id", id);
    window.sessionStorage.setItem("sales-active-floor-id", id);
  } catch {
    /* ignore */
  }
  return id;
}

function getCartFingerprint(items) {
  return (items || [])
    .map((item) => `${item.cartId || item.id}:${item.qty}:${item.name}:${item.size || ""}`)
    .sort()
    .join("|");
}

function cartOptionsKey(options) {
  return JSON.stringify(
    [...(options || [])]
      .map((opt) => String(opt).trim())
      .filter(Boolean)
      .sort(),
  );
}

function isSameCartLine(a, b) {
  return (
    String(a.id) === String(b.id) &&
    String(a.size || "Standard") === String(b.size || "Standard") &&
    String(a.preparationStyle || "") === String(b.preparationStyle || "") &&
    Number(a.price) === Number(b.price) &&
    Boolean(a.isOffer) === Boolean(b.isOffer) &&
    cartOptionsKey(a.options) === cartOptionsKey(b.options) &&
    cartChoiceSelectionsKey(a.choiceSelections) ===
      cartChoiceSelectionsKey(b.choiceSelections)
  );
}

function nextCartId(seqRef) {
  seqRef.current += 1;
  return `c-${seqRef.current}`;
}

function mergeCartLines(prev, incomingLines, seqRef) {
  const next = [...prev];
  for (const line of incomingLines) {
    const idx = next.findIndex((item) => isSameCartLine(item, line));
    if (idx >= 0) {
      next[idx] = { ...next[idx], qty: next[idx].qty + line.qty };
    } else {
      next.push({
        ...line,
        cartId: line.cartId || nextCartId(seqRef),
      });
    }
  }
  return next;
}

export default function OrderPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
  const sessionId = params.sessionId;
  const isWalkIn = sessionId === "walk-in";
  const isStaffOrder = sessionId === "staff";
  const isDirectOrder = isWalkIn || isStaffOrder;
  const isLegacyNew = sessionId === "new";
  const isNoSession = isDirectOrder || isLegacyNew;
  const hasTableSession = !isNoSession;

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
  const [selectedOfferChoices, setSelectedOfferChoices] = useState([]);
  const [selectedOfferDrinks, setSelectedOfferDrinks] = useState([]);
  const [selectedOfferInclusions, setSelectedOfferInclusions] = useState([]);
  const [selectedProductChoices, setSelectedProductChoices] = useState({});

  // New states
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountryCode, setGuestCountryCode] = useState("+1");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestTable, setGuestTable] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffOrderReason, setStaffOrderReason] = useState("");
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
  const sessionFloorIdRef = useRef(null);

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
            fetch("/api/menu/categories?active=1"),
            fetch("/api/menu/products?active=1"),
            fetch("/api/tax"),
            fetch("/api/tax/servicetax?active=1"),
            fetch("/api/menu/heads?active=1"),
            fetch("/api/menu/product-heads?active=1"),
            fetch("/api/menu/offers?active=1"),
          ]);
        const catJson = await catRes.json();
        const prodJson = await prodRes.json();
        const taxJson = await taxRes.json();
        const serviceTaxJson = await serviceTaxRes.json();
        const headJson = await headRes.json();
        const phJson = await phRes.json();
        const offerJson = await offerRes.json();

        if (catJson.success) {
          const cats = (catJson.data || [])
            .filter((c) => String(c.status || "Active") !== "Inactive")
            .map((c) => c.name);
          setCategories(["All", ...cats]);
        }
        if (prodJson.success) {
          setMenuItems(
            (prodJson.data || []).filter((p) => {
              const productActive = String(p.status || "Active") !== "Inactive";
              const categoryActive =
                String(p.category?.status || "Active") !== "Inactive";
              return productActive && categoryActive;
            }),
          );
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
            (h) =>
              String(h.name).toLowerCase() !== "offer" &&
              String(h.status || "Active") !== "Inactive",
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
          setProductHeads(
            (phJson.data || []).filter(
              (ph) =>
                String(ph.status || "Active") !== "Inactive" &&
                String(ph.head?.status || "Active") !== "Inactive",
            ),
          );
        }
        if (offerJson.success) {
          setOffers(Array.isArray(offerJson.data) ? offerJson.data : []);
        }

        if (isStaffOrder) {
          const empRes = await fetch("/api/sales/employees");
          const empJson = await empRes.json();
          if (empJson.success) {
            setEmployees(empJson.data || []);
          }
        }

        // Fetch session and existing order data for table orders
        if (hasTableSession) {
          const sessionRes = await fetch(`/api/sales/sessions?sessionId=${sessionId}`);
          const sessionJson = await sessionRes.json();
          if (sessionJson.success && sessionJson.data) {
            const currentSession = sessionJson.data;
            const tableNumber =
              currentSession.tableNumber ||
              currentSession.tableNumbers ||
              currentSession.primaryTable?.tableNumber ||
              null;
            const floorName =
              currentSession.floor?.name ||
              currentSession.floorName ||
              null;
            const sessionFloorId = persistSalesFloorId(
              currentSession.floorId ||
                currentSession.floor?._id ||
                currentSession.floor,
            );
            if (sessionFloorId) sessionFloorIdRef.current = sessionFloorId;
            setSessionData({
              ...currentSession,
              tableNumber,
              floorName,
              floorId: sessionFloorId,
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
            const orderFloorId = persistSalesFloorId(
              existingOrder.floorId || existingOrder.floor,
            );
            if (orderFloorId && !sessionFloorIdRef.current) {
              sessionFloorIdRef.current = orderFloorId;
            }
            setOrderStatus(existingOrder.status);
            setOrderNote(existingOrder.specialNote || "");
            if (existingOrder.partyName || existingOrder.guestName) {
              setGuestName(existingOrder.partyName || existingOrder.guestName);
            }
            if (existingOrder.contactNumber) {
              setGuestPhone(existingOrder.contactNumber);
            }
            if (existingOrder.guestCountryCode) {
              setGuestCountryCode(existingOrder.guestCountryCode);
            }
            if (existingOrder.guestEmail) {
              setGuestEmail(existingOrder.guestEmail);
            }

            // Reconstruct cart
            const restoredCart = existingOrder.items.map((item, idx) => {
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
                const offerModifier = buildOfferCartModifier({
                  inclusions,
                  choices,
                  drinks,
                });
                if (offerModifier) parts.push(offerModifier);
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
                serviceCharge: 0,
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
                choiceSelections: normalizeChoiceSelections(item.choiceSelections),
                modifier: parts.length > 0 ? parts.join(" | ") : undefined,
                cartId: item.cartId || `r-${Date.now()}-${idx}`,
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
        } else if (isDirectOrder) {
          const savedOrderId = sessionStorage.getItem(`direct-order-${sessionId}`);
          if (savedOrderId) {
            const orderRes = await fetch(
              `/api/orders/employee?orderId=${savedOrderId}`,
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
              if (existingOrder.contactNumber) {
                setGuestPhone(existingOrder.contactNumber);
              }
              if (existingOrder.guestCountryCode) {
                setGuestCountryCode(existingOrder.guestCountryCode);
              }
              if (existingOrder.guestEmail) {
                setGuestEmail(existingOrder.guestEmail);
              }
              if (existingOrder.staffFor) {
                setSelectedStaffId(String(existingOrder.staffFor));
              }
              if (existingOrder.staffOrderReason) {
                setStaffOrderReason(existingOrder.staffOrderReason);
              }
              const restoredCart = existingOrder.items.map((item, idx) => {
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
                  const offerModifier = buildOfferCartModifier({
                    inclusions,
                    choices,
                    drinks,
                  });
                  if (offerModifier) parts.push(offerModifier);
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
                  serviceCharge: 0,
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
                  choiceSelections: normalizeChoiceSelections(item.choiceSelections),
                  modifier: parts.length > 0 ? parts.join(" | ") : undefined,
                  cartId: item.cartId || `r-${Date.now()}-${idx}`,
                };
              });
              setCart(restoredCart);
              setKotCartFingerprint(getCartFingerprint(restoredCart));
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
    setServerName(formatOrderServerName(activeOrder, currentUser));
  }, [currentUser, activeOrder]);

  useEffect(() => {
    if (!isStaffOrder || selectedStaffId || employees.length === 0) return;
    const myId = String(currentUser?._id || currentUser?.id || "");
    if (!myId) return;
    const me = employees.find((emp) => String(emp.id || emp._id) === myId);
    if (me) setSelectedStaffId(String(me.id || me._id));
  }, [isStaffOrder, employees, currentUser, selectedStaffId]);

  useEffect(() => {
    if (!isStaffOrder) return;
    const emp = employees.find(
      (e) => String(e.id || e._id) === String(selectedStaffId),
    );
    setAppliedDiscount(
      buildStaffDiscountState(emp?.staffDiscount, emp?.name),
    );
  }, [isStaffOrder, selectedStaffId, employees]);

  const fetchOrderOnly = useCallback(async () => {
    if (isNoSession) {
      const savedOrderId = sessionStorage.getItem(`direct-order-${sessionId}`);
      if (!savedOrderId) return;
      try {
        const orderRes = await fetch(
          `/api/orders/employee?orderId=${savedOrderId}`,
        );
        const orderJson = await orderRes.json();
        if (orderJson.success && orderJson.data) {
          setActiveOrder(orderJson.data);
          setOrderStatus(orderJson.data.status);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }
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
  }, [sessionId, isNoSession]);

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

  const closeOptionsModal = () => {
    setIsOptionsModalOpen(false);
    setSelectedProduct(null);
    setSelectedPreparationStyle("");
    setVariantQtyBySize({});
    setAddonQtyById({});
    setSelectedOfferChoices([]);
    setSelectedOfferDrinks([]);
    setSelectedOfferInclusions([]);
    setSelectedProductChoices({});
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
    setSelectedOfferChoices([]);
    setSelectedOfferDrinks([]);
    setSelectedOfferInclusions([]);
    setSelectedProductChoices({});
    setIsOptionsModalOpen(true);
  };

  const handleOpenOfferOptions = (offer) => {
    setSelectedProduct({ ...offer, isOffer: true });
    setVariantQtyBySize({});
    setAddonQtyById({});
    setSelectedPreparationStyle("");
    const inclusions = cleanOfferList(offer.inclusions);
    const choices = cleanOfferList(offer.choices);
    const drinks = cleanOfferList(offer.drinks);
    setSelectedOfferInclusions(inclusions);
    setSelectedOfferChoices(choices.length === 1 ? choices : []);
    setSelectedOfferDrinks(drinks.length === 1 ? drinks : []);
    setSelectedProductChoices({});
    setIsOptionsModalOpen(true);
  };

  const toggleOfferOption = (setter, item) => {
    setter((prev) =>
      prev.includes(item)
        ? prev.filter((value) => value !== item)
        : [...prev, item],
    );
  };

  const toggleProductSubChoice = (groupIndex, value) => {
    setSelectedProductChoices((prev) => {
      const current = prev[groupIndex] || [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [groupIndex]: next };
    });
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
    return hasVariants || hasAddons || hasStyles || productHasChoiceOptions(product);
  };

  const addToCart = (product) => {
    if (productNeedsOptions(product)) {
      handleOpenOptions(product);
      return;
    }

    const price = product.price || 0;
    const itemTax = calculateItemTax(product, price);

    setCart((prev) =>
      mergeCartLines(
        prev,
        [
          {
            id: product._id,
            name: product.name,
            productCode: product.productCode || "",
            category: product.category?.name || "ITEMS",
            price,
            tax: itemTax,
            serviceCharge: 0,
            qty: 1,
            size: "Standard",
            sizes: [],
            preparationStyle: null,
            options: [],
            productType: product.productType === "BAR" ? "BAR" : "KITCHEN",
            choiceSelections: [],
          },
        ],
        cartIdSeq,
      ),
    );
  };

  const addOfferToCart = (offer, selection = {}) => {
    if (!isOfferInDateRange(offer)) {
      toast.error("This offer is not valid today");
      return false;
    }
    const price = Number(offer.price) || 0;
    const itemTax = calculateOfferTax(offer, price);
    const inclusions = cleanOfferList(
      selection.inclusions ?? offer.inclusions,
    );
    const choices = cleanOfferList(selection.choices);
    const drinks = cleanOfferList(selection.drinks);
    const extras = buildOfferOptions({ inclusions, choices, drinks });
    const modifier = buildOfferCartModifier({ inclusions, choices, drinks });

    setCart((prev) =>
      mergeCartLines(
        prev,
        [
          {
            id: offer._id,
            name: offer.name,
            productCode: "",
            category: OFFER_CATEGORY,
            price,
            tax: itemTax,
            serviceCharge: 0,
            qty: 1,
            size: "Standard",
            sizes: [],
            preparationStyle: null,
            options: extras,
            modifier,
            productType: "KITCHEN",
            isOffer: true,
            inclusions,
            choices,
            drinks,
          },
        ],
        cartIdSeq,
      ),
    );
    toast.success(`${offer.name} added`);
    return true;
  };

  const addOfferFromList = (offer) => {
    if (offerNeedsOptions(offer)) {
      handleOpenOfferOptions(offer);
      return;
    }
    addOfferToCart(offer);
  };

  const addModifiedItemToCart = () => {
    if (!selectedProduct) return;

    if (isOfferItem(selectedProduct)) {
      const added = addOfferToCart(selectedProduct, {
        inclusions: selectedOfferInclusions,
        choices: selectedOfferChoices,
        drinks: selectedOfferDrinks,
      });
      if (added) closeOptionsModal();
      return;
    }

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

    const choiceSelections = normalizeChoiceOptions(
      selectedProduct.choiceOptions,
    )
      .map((group, index) => ({
        name: group.name,
        subChoices: selectedProductChoices[index] || [],
      }))
      .filter((group) => group.subChoices.length > 0);

    const newLines = [];

    if (hasVariants) {
      variantEntries.forEach(([size, qty], idx) => {
        const variant = selectedProduct.variants.find((v) => v.size === size);
        const unitPrice = Number(variant?.price) || 0;
        const unitTax = calculateItemTax(selectedProduct, unitPrice);
        const options = [];
        if (selectedPreparationStyle) options.push(selectedPreparationStyle);
        const parts = [`Size: ${size}`];
        if (selectedPreparationStyle) parts.push(selectedPreparationStyle);

        newLines.push({
          id: selectedProduct._id,
          name: selectedProduct.name,
          productCode: selectedProduct.productCode || "",
          category: selectedProduct.category?.name || "ITEMS",
          price: unitPrice,
          tax: unitTax,
          serviceCharge: 0,
          qty,
          size,
          sizes: [size],
          preparationStyle: selectedPreparationStyle || null,
          options,
          productType:
            selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
          modifier: parts.join(" | "),
          choiceSelections,
        });
      });
    } else {
      const unitPrice = selectedProduct.price || 0;
      const unitTax = calculateItemTax(selectedProduct, unitPrice);
      const options = [];
      if (selectedPreparationStyle) options.push(selectedPreparationStyle);
      newLines.push({
        id: selectedProduct._id,
        name: selectedProduct.name,
        productCode: selectedProduct.productCode || "",
        category: selectedProduct.category?.name || "ITEMS",
        price: unitPrice,
        tax: unitTax,
        serviceCharge: 0,
        qty: 1,
        size: "Standard",
        sizes: [],
        preparationStyle: selectedPreparationStyle || null,
        options,
        productType: selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
        modifier: selectedPreparationStyle || undefined,
        choiceSelections,
      });
    }

    addonEntries.forEach((entry, idx) => {
      const addon = entry.addon;
      const unitPrice = Number(addon.price) || 0;
      const unitTax = calculateItemTax(selectedProduct, unitPrice);
      newLines.push({
        id: selectedProduct._id,
        name: selectedProduct.name,
        productCode: selectedProduct.productCode || "",
        category: selectedProduct.category?.name || "ITEMS",
        price: unitPrice,
        tax: unitTax,
        serviceCharge: 0,
        qty: entry.qty,
        size: "Extra",
        sizes: [],
        preparationStyle: null,
        options: [addon.name],
        productType: selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
        modifier: `Addons: ${addon.name}`,
      });
    });

    if (newLines.length === 0) {
      toast.error("Select a variant or extra");
      return;
    }

    setCart((prev) => mergeCartLines(prev, newLines, cartIdSeq));
    closeOptionsModal();
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
    const table =
      sessionData?.tableNumber ||
      sessionData?.tableNumbers ||
      activeOrder?.tableNo ||
      (sessionId === "new" ? guestTable : "") ||
      "";
    return formatTableLocation(
      table,
      sessionData?.floorName || activeOrder?.floorName,
    );
  };

  const resolvePartyName = (nameOverride) => {
    const trimmed = (nameOverride ?? guestName ?? "").trim();
    if (trimmed) return trimmed;

    if (isWalkIn || isLegacyNew) return "Walk-in";

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

  const submitOrder = async ({
    partyName,
    staffForId = null,
    staffReason = null,
  }) => {
    const orderSource = isWalkIn
      ? "WALK_IN"
      : isStaffOrder
        ? "STAFF"
        : isLegacyNew
          ? "POS"
          : undefined;

    try {
      setIsSubmitting(true);
      const payload = {
        items: cart,
        subTotal: subtotal,
        taxTotal: totalTax,
        serviceChargeTotal: 0,
        serviceChargeName: null,
        discountTotal: discountAmount,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        totalAmount: total,
        specialNote: orderNote,
        sessionId: hasTableSession ? sessionId : null,
        orderId: activeOrder?._id || undefined,
        tableNo: isLegacyNew ? guestTable : undefined,
        guestName: partyName,
        partyName,
        contactNumber: guestPhone.trim() || null,
        guestCountryCode: guestPhone.trim() ? guestCountryCode : null,
        guestEmail: guestEmail.trim() || null,
        guestCount: sessionData?.guestCount ?? null,
        orderType: orderType,
        source: orderSource,
        staffForId: staffForId || undefined,
        staffOrderReason: staffReason || undefined,
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
          isBarTicket ? "Bar ticket created!" : "Order sent to kitchen!",
        );
        setIsKitchenModalOpen(false);
        setIsStaffModalOpen(false);
        setGuestName(partyName);
        setActiveOrder((prev) => ({
          ...(prev || {}),
          ...json.data,
          processedByName:
            json.data.processedByName || prev?.processedByName,
        }));
        setOrderStatus("PENDING");
        setKotCartFingerprint(getCartFingerprint(cart));

        if (isDirectOrder && json.data._id) {
          sessionStorage.setItem(`direct-order-${sessionId}`, json.data._id);
        }

        if (json.data.kotPayload && json.data.kotPayload.length > 0) {
          const printPayload = {
            ...json.data,
            partyName,
            guestName: partyName,
            source: json.data.source || orderSource,
            tableNo: isDirectOrder ? undefined : json.data.tableNo,
            guestCount: sessionData?.guestCount ?? json.data.guestCount ?? null,
          };
          setPrintOrderData(printPayload);
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

  const handleSendToKitchen = () => {
    if (cart.length === 0 || hasSentKot) return;
    if (isStaffOrder) {
      setIsStaffModalOpen(true);
    } else {
      setIsKitchenModalOpen(true);
    }
  };

  const handleConfirmKitchen = async () => {
    if (isLegacyNew && !guestName.trim() && !guestTable.trim()) {
      toast.error("Enter a party name or table number.");
      return;
    }

    const email = guestEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email or leave it blank.");
      return;
    }

    const phoneDigits = guestPhone.replace(/\D/g, "");
    if (guestPhone.trim() && phoneDigits.length < 7) {
      toast.error("Enter a valid phone number or leave it blank.");
      return;
    }

    const partyName = resolvePartyName();
    await submitOrder({ partyName });
  };

  const handleConfirmStaff = async () => {
    if (!selectedStaffId) {
      toast.error("Please select a staff member.");
      return;
    }
    const selectedEmployee = employees.find(
      (emp) => String(emp.id || emp._id) === String(selectedStaffId),
    );
    const partyName = selectedEmployee?.name || "Staff";
    await submitOrder({
      partyName,
      staffForId: selectedStaffId,
      staffReason: staffOrderReason.trim() || null,
    });
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
    const floorId =
      persistSalesFloorId(sessionFloorIdRef.current) ||
      persistSalesFloorId(sessionData?.floorId) ||
      persistSalesFloorId(sessionData?.floor) ||
      persistSalesFloorId(activeOrder?.floor) ||
      persistSalesFloorId(
        typeof window !== "undefined"
          ? window.localStorage.getItem("sales-active-floor-id")
          : null,
      );
    if (floorId) {
      router.push(`/sales/floor?floor=${encodeURIComponent(floorId)}`);
      return;
    }
    router.push("/sales/floor");
  };

  const handleReleaseTable = async (shouldRelease) => {
    persistSalesFloorId(
      sessionFloorIdRef.current || sessionData?.floorId || sessionData?.floor,
    );
    if (!shouldRelease || isNoSession) {
      setIsReleaseModalOpen(false);
      if (isDirectOrder) {
        sessionStorage.removeItem(`direct-order-${sessionId}`);
      }
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
    if (!isStaffOrder) setAppliedDiscount(null);
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
                {isWalkIn
                  ? "Walk-in Customer"
                  : isStaffOrder
                    ? "Staff Order"
                    : isLegacyNew
                      ? guestTable
                        ? `${guestTable} · Takeaway`
                        : "Takeaway"
                      : getDisplayTableNo() || "Loading table..."}
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
                    const hasOptions = offerNeedsOptions(offer);

                    return (
                      <div
                        key={offer._id}
                        className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all hover:shadow-md min-h-[76px]"
                      >
                        <div className="flex-1 flex flex-col justify-center px-4 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 shrink-0">
                              OFFER
                            </span>
                            <span className="font-bold text-zinc-900 text-xs md:text-sm leading-tight">
                              {offer.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-zinc-500">
                              {OFFER_CATEGORY}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className="w-20 flex flex-col items-center justify-center px-3 py-2 border-r border-zinc-200 h-full">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Price
                            </span>
                            <span className="text-sm font-black text-zinc-900">
                              ${totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="w-full sm:w-32 shrink-0 p-2 flex items-center justify-center">
                          <Button
                            className="w-full h-full min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                            onClick={() => addOfferFromList(offer)}
                          >
                            {hasOptions ? "Options" : "Add"}
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
                    return (
                    <div
                      key={item.cartId || `${item.id}-${idx}`}
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
                          {item.modifier ? (
                            <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                              {item.modifier}
                            </p>
                          ) : null}
                          {!isOfferItem(item) &&
                          normalizeChoiceSelections(item.choiceSelections).length > 0 ? (
                            <div className="mt-1.5 space-y-1.5">
                              {normalizeChoiceSelections(item.choiceSelections).map(
                                (group) => (
                                  <div key={group.name}>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                                      {group.name}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {group.subChoices.map((choice) => (
                                        <span
                                          key={`${group.name}-${choice}`}
                                          className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800"
                                        >
                                          {choice}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
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
                    {isStaffOrder || appliedDiscount?.code === "STAFF"
                      ? "Staff Discount"
                      : `Discount${
                          appliedDiscount?.code
                            ? ` (${appliedDiscount.code})`
                            : ""
                        }`}
                  </span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>HST</span>
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
                disabled={cart.length === 0 || isSubmitting || hasSentKot}
                className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : hasSentKot ? (
                  "KOT Sent"
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
      {isKitchenModalOpen && !isStaffOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {isWalkIn ? "Bill under whose name?" : "Party Name"}
                </h2>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">
                  {isWalkIn
                    ? "Optional — leave blank to use Walk-in."
                    : "Whose bill is this for? Optional — leave blank to use table + guests."}
                </p>
              </div>
              <button
                onClick={() => setIsKitchenModalOpen(false)}
                className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                  <span className="text-zinc-400 font-semibold normal-case">
                    (optional)
                  </span>
                </label>
                <div className="flex">
                  <Select value={guestCountryCode} onValueChange={setGuestCountryCode}>
                    <SelectTrigger className="w-28 h-12 text-xs rounded-r-none border-r-0 border-zinc-200 bg-zinc-50 font-medium">
                      <SelectValue placeholder="+1" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {countryCodes.map((entry) => (
                        <SelectItem key={entry.code} value={entry.code}>
                          {entry.code} {entry.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. 5551234567"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="h-12 border-zinc-200 rounded-l-none text-sm font-semibold focus-visible:ring-blue-500 flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                  <span className="text-zinc-400 font-semibold normal-case">
                    (optional)
                  </span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. guest@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="h-12 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
                />
              </div>

              {isLegacyNew && (
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

              {hasTableSession && (
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

      <StaffOrderPartyModal
        open={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        employees={employees}
        selectedStaffId={selectedStaffId}
        onStaffChange={setSelectedStaffId}
        staffOrderReason={staffOrderReason}
        onReasonChange={setStaffOrderReason}
        onConfirm={handleConfirmStaff}
        isSubmitting={isSubmitting}
      />

      <TodayOrderPaymentModal
        key={activeOrder?._id || "session-payment"}
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        sessionId={hasTableSession ? sessionId : undefined}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        redeemNote="POS Payment"
        serviceTax={serviceTax}
        order={
          activeOrder
            ? {
                ...activeOrder,
                subTotal: subtotal,
                taxTotal: totalTax,
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
                  isDirectOrder
                    ? ""
                    : getDisplayTableNo() ||
                      (isLegacyNew ? guestTable : "") ||
                      "",
                floorName: sessionData?.floorName || activeOrder?.floorName,
                source: activeOrder.source,
                staffFor: selectedStaffId || activeOrder.staffFor,
                tableSession: hasTableSession ? sessionId : undefined,
              }
            : null
        }
        onPaid={(updatedOrder) => {
          setOrderStatus("PAID");
          setActiveOrder((prev) => ({ ...(prev || {}), ...updatedOrder }));
          if (isDirectOrder) {
            sessionStorage.removeItem(`direct-order-${sessionId}`);
          }
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
                  {isOfferItem(selectedProduct) ? (
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 mr-2 align-middle">
                      OFFER
                    </span>
                  ) : selectedProduct.productCode ? (
                    <span className="text-orange-600 mr-2">
                      {selectedProduct.productCode}
                    </span>
                  ) : null}
                  {selectedProduct.name}
                </h2>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">
                  {isOfferItem(selectedProduct)
                    ? "Select inclusions, choices and drinks"
                    : "Select variations and extras"}
                </p>
              </div>
              <button
                onClick={closeOptionsModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                {isOfferItem(selectedProduct) ? (
                  <>
                    {cleanOfferList(selectedProduct.inclusions).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                          Inclusions
                        </span>
                        <div className="grid gap-2">
                          {cleanOfferList(selectedProduct.inclusions).map(
                            (item) => (
                              <label
                                key={item}
                                className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedOfferInclusions.includes(item)
                                    ? "border-orange-500 bg-orange-50/30"
                                    : "border-zinc-200 hover:border-orange-300"
                                }`}
                              >
                                <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800">
                                  <input
                                    type="checkbox"
                                    checked={selectedOfferInclusions.includes(
                                      item,
                                    )}
                                    onChange={() =>
                                      toggleOfferOption(
                                        setSelectedOfferInclusions,
                                        item,
                                      )
                                    }
                                    className="w-4 h-4 accent-orange-500"
                                  />
                                  <span>{item}</span>
                                </div>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {cleanOfferList(selectedProduct.choices).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                          Choices
                        </span>
                        <div className="grid gap-2">
                          {cleanOfferList(selectedProduct.choices).map(
                            (choice) => (
                              <label
                                key={choice}
                                className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedOfferChoices.includes(choice)
                                    ? "border-orange-500 bg-orange-50/30"
                                    : "border-zinc-200 hover:border-orange-300"
                                }`}
                              >
                                <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800">
                                  <input
                                    type="checkbox"
                                    checked={selectedOfferChoices.includes(
                                      choice,
                                    )}
                                    onChange={() =>
                                      toggleOfferOption(
                                        setSelectedOfferChoices,
                                        choice,
                                      )
                                    }
                                    className="w-4 h-4 accent-orange-500"
                                  />
                                  <span>{choice}</span>
                                </div>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {cleanOfferList(selectedProduct.drinks).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                          Drinks
                        </span>
                        <div className="grid gap-2">
                          {cleanOfferList(selectedProduct.drinks).map(
                            (drink) => (
                              <label
                                key={drink}
                                className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedOfferDrinks.includes(drink)
                                    ? "border-orange-500 bg-orange-50/30"
                                    : "border-zinc-200 hover:border-orange-300"
                                }`}
                              >
                                <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800">
                                  <input
                                    type="checkbox"
                                    checked={selectedOfferDrinks.includes(
                                      drink,
                                    )}
                                    onChange={() =>
                                      toggleOfferOption(
                                        setSelectedOfferDrinks,
                                        drink,
                                      )
                                    }
                                    className="w-4 h-4 accent-orange-500"
                                  />
                                  <span>{drink}</span>
                                </div>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-100 pb-2 px-3 gap-1">
                  <div className="flex-1 min-w-[100px]">Option</div>
                  <div className="w-20 text-center">Qty</div>
                  <div className="w-14 text-center">Base</div>
                  <div className="w-16 text-center">Discount</div>
                  <div className="w-16 text-center">Tax</div>
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
                          const unitFinal = discountedPrice + taxAmount;
                          const lineTax = taxAmount * qty;
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

                {normalizeChoiceOptions(selectedProduct.choiceOptions).length > 0 && (
                  <div className="space-y-5">
                    {normalizeChoiceOptions(selectedProduct.choiceOptions).map(
                      (group, groupIndex) => (
                        <div key={`${group.name}-${groupIndex}`} className="space-y-2">
                          <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                            {group.name}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {group.subChoices.map((choice) => {
                              const selected = (
                                selectedProductChoices[groupIndex] || []
                              ).includes(choice);
                              return (
                                <label
                                  key={`${group.name}-${choice}`}
                                  className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                                    selected
                                      ? "border-orange-500 bg-orange-50/30"
                                      : "border-zinc-200 hover:border-orange-300"
                                  }`}
                                >
                                  <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() =>
                                        toggleProductSubChoice(groupIndex, choice)
                                      }
                                      className="w-4 h-4 accent-orange-500"
                                    />
                                    <span>{choice}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {selectedProduct.addons &&
                  selectedProduct.addons.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-zinc-100 space-y-2">
                      <span className="text-[13px] font-bold text-zinc-900 mb-2 block">
                        Addons
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
                          const unitFinal = discountedPrice + taxAmount;
                          const lineTax = taxAmount * qty;
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
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex gap-3 shrink-0 rounded-b-2xl">
              <Button
                onClick={closeOptionsModal}
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
            if (hasTableSession) {
              setIsReleaseModalOpen(true);
            } else {
              if (isDirectOrder) {
                sessionStorage.removeItem(`direct-order-${sessionId}`);
              }
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
