"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Columns2,
  Columns3,
  Coffee,
  Utensils,
  UtensilsCrossed,
  Wine,
  Cake,
  Pizza,
  Sandwich,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CreateOrderSkeleton from "@/components/sales/CreateOrderSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import StaffOrderPartyModal from "@/components/sales/StaffOrderPartyModal";
import IngredientChips from "@/components/menu/IngredientChips";
import { useAuth } from "@/components/providers/AuthProvider";
import { buildStaffDiscountState } from "@/lib/orders/staffDiscount";
import { formatTableLocation, resolveDocumentId } from "@/utils/orderDisplay";
import { canPayFromCreateOrder } from "@/utils/floorRoles";
import {
  isSeatSettled,
  isSeatReleased,
  formatSeatLabel,
  getUnsettledSeatNumbers,
} from "@/lib/orders/seatHelpers";
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
  productHasCustomData,
  normalizeChoiceOptions,
  normalizeChoiceSelections,
  normalizeCustomData,
  normalizeCustomDataSelections,
  normalizeCustomExtras,
  customExtrasUnitTotal,
  cartChoiceSelectionsKey,
  cartCustomDataSelectionsKey,
  cartCustomExtrasKey,
  getItemLineTotal,
  getVisibleCartModifier,
  isStandaloneExtraLine,
  isRedundantStandaloneExtraOption,
} from "@/utils/productChoices";
import { buildModifiedRequestRemark } from "@/utils/modifiedRequestRemark";

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

/** Resume takeaway/staff only while the order is still open (not paid). */
function isOpenDirectOrderStatus(order) {
  if (!order) return false;
  const status = String(order.status || "").toUpperCase();
  const paid =
    String(order.paymentStatus || "").toUpperCase() === "PAID" ||
    status === "PAID";
  if (paid) return false;
  return status === "PENDING" || status === "CONFIRMED";
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

function normalizeCartSeatNumber(value) {
  if (value === undefined || value === null || value === "" || value === "table") {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/** Header styles for Table + Seat accordions (cycles after Seat 4). */
const SEAT_ACCORDION_STYLES = [
  { header: "bg-orange-500 text-white", badge: "bg-white/20 text-white" }, // Table
  { header: "bg-[#9CA36A] text-white", badge: "bg-white/20 text-white" }, // Seat 1
  { header: "bg-teal-400 text-white", badge: "bg-white/25 text-white" }, // Seat 2
  { header: "bg-slate-400 text-white", badge: "bg-white/25 text-white" }, // Seat 3
  { header: "bg-violet-500 text-white", badge: "bg-white/20 text-white" }, // Seat 4+
];

function getSeatAccordionStyle(seatNumber) {
  if (seatNumber == null) return SEAT_ACCORDION_STYLES[0];
  const idx = ((Math.floor(seatNumber) - 1) % 4) + 1;
  return SEAT_ACCORDION_STYLES[idx] || SEAT_ACCORDION_STYLES[1];
}

function formatSeatAccordionLabel(seatNumber) {
  if (seatNumber == null) return "Table";
  return `Seat ${String(seatNumber).padStart(2, "0")}`;
}

function getCartFingerprint(items) {
  return (items || [])
    .map(
      (item) =>
        `${item.cartId || item.id}:${item.qty}:${item.name}:${item.size || ""}:s${normalizeCartSeatNumber(item.seatNumber) ?? "t"}`,
    )
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
    normalizeCartSeatNumber(a.seatNumber) === normalizeCartSeatNumber(b.seatNumber) &&
    String(a.notes || "").trim() === String(b.notes || "").trim() &&
    cartOptionsKey(a.options) === cartOptionsKey(b.options) &&
    cartCustomExtrasKey(a.customExtras) === cartCustomExtrasKey(b.customExtras) &&
    cartChoiceSelectionsKey(a.choiceSelections) ===
      cartChoiceSelectionsKey(b.choiceSelections) &&
    cartCustomDataSelectionsKey(a.customDataSelections) ===
      cartCustomDataSelectionsKey(b.customDataSelections) &&
    cartChoiceSelectionsKey(a.addonChoiceSelections) ===
      cartChoiceSelectionsKey(b.addonChoiceSelections)
  );
}

function getVariantKey(_variant, index) {
  return String(index);
}

function getAddonKey(addon) {
  return String(addon?._id || addon?.name || "");
}

function buildAddonChoiceSelections(addon, choicesByGroup = {}) {
  return normalizeChoiceOptions(addon?.choiceOptions)
    .map((group, index) => ({
      name: group.name,
      subChoices: choicesByGroup[index] || [],
    }))
    .filter((group) => group.subChoices.length > 0);
}

function buildCartFromOrderItems(items = []) {
  return items.map((item, idx) => {
    const style = item.preparationStyle || null;
    const extras = (item.options || []).filter((o) => {
      if (String(o).toLowerCase().startsWith("style:")) return false;
      // Extra lines keep addon name in options for pricing — don't show again
      if (isRedundantStandaloneExtraOption(item, o)) return false;
      return true;
    });
    const offer = isOfferItem(item);
    const inclusions = cleanOfferList(item.inclusions);
    const choices = cleanOfferList(item.choices);
    const drinks = cleanOfferList(item.drinks);
    const parts = [];
    if (
      item.size &&
      item.size !== "Standard" &&
      !isStandaloneExtraLine(item)
    ) {
      parts.push(`Size: ${item.size}`);
    }
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
      choiceSelections: normalizeChoiceSelections(item.choiceSelections),
      customDataSelections: normalizeCustomDataSelections(
        item.customDataSelections,
      ),
      addonChoiceSelections: normalizeChoiceSelections(item.addonChoiceSelections),
      customExtras: normalizeCustomExtras(item.customExtras),
      modifier: parts.length > 0 ? parts.join(" | ") : undefined,
      noteWithout: String(item.noteWithout || "").trim(),
      noteAdd: String(item.noteAdd || "").trim(),
      notes: String(item.notes || "").trim(),
      cartId: item.cartId || `r-${Date.now()}-${idx}`,
      seatNumber: normalizeCartSeatNumber(item.seatNumber),
    };
  });
}

function syncCartIdSeqFromItems(seqRef, items = []) {
  let max = Number(seqRef.current) || 0;
  for (const item of items) {
    const raw = String(item?.cartId || "");
    const legacyMatch = raw.match(/^c-(\d+)$/);
    if (legacyMatch) {
      max = Math.max(max, Number(legacyMatch[1]));
      continue;
    }
    const stampedMatch = raw.match(/^c-\d+-(\d+)$/);
    if (stampedMatch) {
      max = Math.max(max, Number(stampedMatch[1]));
    }
  }
  seqRef.current = max;
}

function nextCartId(seqRef) {
  seqRef.current += 1;
  return `c-${Date.now()}-${seqRef.current}`;
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
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 font-semibold text-zinc-500">Loading menu...</p>
        </div>
      }
    >
      <OrderPageContent />
    </React.Suspense>
  );
}

function OrderPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
  const sessionId = params.sessionId;
  const isTakeAway = sessionId === "takeaway";
  const isStaffOrder = sessionId === "staff";
  const isDirectOrder = isTakeAway || isStaffOrder;
  const isLegacyNew = sessionId === "new";
  const isNoSession = isDirectOrder || isLegacyNew;
  const hasTableSession = !isNoSession;
  const queryOrderId = searchParams.get("orderId");
  const queryStaffId = searchParams.get("staffId") || "";
  const refreshPay = searchParams.get("refreshPay") === "1";
  const isFreshDirect =
    isDirectOrder && searchParams.get("fresh") === "1";
  const directOrderStorageKey = `direct-order-${sessionId}`;

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
  /** null = shared Table bucket; 1..guestCount = seat (accordion open target) */
  const [activeSeatNumber, setActiveSeatNumber] = useState(null);
  const seatAccordionInitRef = useRef(false);
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
  /** { [groupIndex]: { [optionIndex]: string[] } } */
  const [selectedCustomData, setSelectedCustomData] = useState({});
  const [customExtraModal, setCustomExtraModal] = useState(null);
  const [customExtraName, setCustomExtraName] = useState("");
  const [customExtraPrice, setCustomExtraPrice] = useState("");
  const [customExtraQty, setCustomExtraQty] = useState("1");
  /** Cart line keys with Modified request inputs expanded */
  const [expandedModifiedRequestKeys, setExpandedModifiedRequestKeys] =
    useState(() => new Set());

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
  const cartIdSeq = useRef(0);

  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState("customer"); // 'customer' | 'kot' | 'bar'
  const [printOrderData, setPrintOrderData] = useState(null);
  const [printKotItems, setPrintKotItems] = useState([]);
  const [printTaxBreakdown, setPrintTaxBreakdown] = useState([]);
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: "TASTY BITES",
  });
  const [redirectAfterPrint, setRedirectAfterPrint] = useState(false);
  const [pendingReleaseAfterPrint, setPendingReleaseAfterPrint] = useState(false);
  const [pendingLeaveAfterPrint, setPendingLeaveAfterPrint] = useState(false);
  const [serverName, setServerName] = useState("Server");
  const [kotCartFingerprint, setKotCartFingerprint] = useState(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isReleasingTable, setIsReleasingTable] = useState(false);
  const [seatReleaseTarget, setSeatReleaseTarget] = useState(null); // { seatNumber, label }
  const [isReleasingSeat, setIsReleasingSeat] = useState(false);
  const sessionFloorIdRef = useRef(null);

  // View / layout states (persisted for staff preference)
  const [panelLayout, setPanelLayout] = useState("3"); // '2' | '3'
  const [gridCols, setGridCols] = useState(4); // 2 | 3 | 4
  const [heads, setHeads] = useState([{ _id: "all", name: "All" }]);
  const [productHeads, setProductHeads] = useState([]);
  const [activeHead, setActiveHead] = useState("All");
  const [offers, setOffers] = useState([]);
  const [isClearOrderModalOpen, setIsClearOrderModalOpen] = useState(false);
  const layoutPrefsLoaded = useRef(false);

  const useHeadsNav = true; // heads always available in 2 + 3 panel
  const useCategoryNav = panelLayout === "2"; // category dropdown in 2-panel search row
  const useCategoryFilter = true; // both panels filter by category
  const useHeadsFilter = true; // both panels filter by head

  const TILE_PALETTE = [
    {
      bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      code: "bg-emerald-600 text-white",
    },
    {
      bg: "bg-sky-50 hover:bg-sky-100 border-sky-200",
      code: "bg-sky-600 text-white",
    },
    {
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
      code: "bg-amber-700 text-white",
    },
    {
      bg: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
      code: "bg-indigo-600 text-white",
    },
    {
      bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",
      code: "bg-rose-600 text-white",
    },
    {
      bg: "bg-teal-50 hover:bg-teal-100 border-teal-200",
      code: "bg-teal-700 text-white",
    },
    {
      bg: "bg-orange-50 hover:bg-orange-100 border-orange-200",
      code: "bg-orange-600 text-white",
    },
    {
      bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
      code: "bg-violet-600 text-white",
    },
    {
      bg: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200",
      code: "bg-cyan-700 text-white",
    },
    {
      bg: "bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-200",
      code: "bg-fuchsia-600 text-white",
    },
  ];

  const getTileTheme = (key) => {
    const str = String(key || "");
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return TILE_PALETTE[hash % TILE_PALETTE.length];
  };

  // 3-panel center column is narrower — ramp column counts more gently.
  const productGridClass =
    panelLayout === "3"
      ? gridCols === 4
        ? "grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-3 gap-2.5"
        : gridCols === 3
          ? "grid grid-cols-2 xl:grid-cols-3 p-3 gap-2.5"
          : "grid grid-cols-2 p-3 gap-2.5"
      : gridCols === 4
        ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 p-3 gap-2.5"
        : gridCols === 3
          ? "grid grid-cols-2 md:grid-cols-3 p-3 gap-2.5"
          : "grid grid-cols-2 p-3 gap-2.5";

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
      return <LayoutGrid className="w-6 h-6" strokeWidth={1.5} />;
    if (headName === "Offer")
      return <Tag className="w-6 h-6" strokeWidth={1.5} />;
    const Icon = headIconMap[headName] || Utensils;
    return <Icon className="w-6 h-6" strokeWidth={1.5} />;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("sales-order-layout");
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.panelLayout === "2" || prefs.panelLayout === "3") {
          setPanelLayout(prefs.panelLayout);
        }
        if ([2, 3, 4].includes(Number(prefs.gridCols))) {
          setGridCols(Number(prefs.gridCols));
        }
      }
    } catch {
      /* ignore */
    }
    layoutPrefsLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!layoutPrefsLoaded.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "sales-order-layout",
        JSON.stringify({
          panelLayout,
          gridCols,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [panelLayout, gridCols]);

  const setPanelLayoutMode = (mode) => {
    setPanelLayout(mode);
    // Narrower menu column in 3-panel — default to 2 tile columns.
    if (mode === "3") {
      setGridCols(2);
    }
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

            const restoredCart = buildCartFromOrderItems(existingOrder.items);
            syncCartIdSeqFromItems(cartIdSeq, restoredCart);
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
          if (isFreshDirect) {
            sessionStorage.removeItem(directOrderStorageKey);
            try {
              if (isTakeAway) {
                router.replace("/sales/orders/takeaway");
              } else if (isStaffOrder) {
                const next = queryStaffId
                  ? `/sales/orders/staff?staffId=${encodeURIComponent(queryStaffId)}`
                  : "/sales/orders/staff";
                router.replace(next);
              }
            } catch {
              /* ignore */
            }
          } else {
            const resumeId =
              queryOrderId ||
              sessionStorage.getItem(directOrderStorageKey) ||
              "";
            if (resumeId) {
              const orderRes = await fetch(
                `/api/orders/employee?orderId=${resumeId}`,
              );
              const orderJson = await orderRes.json();
              if (orderJson.success && orderJson.data) {
                const existingOrder = orderJson.data;
                if (!isOpenDirectOrderStatus(existingOrder)) {
                  sessionStorage.removeItem(directOrderStorageKey);
                } else {
                  sessionStorage.setItem(
                    directOrderStorageKey,
                    String(existingOrder._id),
                  );
                  setActiveOrder(existingOrder);
                  setOrderStatus(existingOrder.status);
                  setOrderNote(existingOrder.specialNote || "");
                  if (existingOrder.partyName || existingOrder.guestName) {
                    setGuestName(
                      existingOrder.partyName || existingOrder.guestName,
                    );
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
                  const restoredCart = buildCartFromOrderItems(
                    existingOrder.items,
                  );
                  syncCartIdSeqFromItems(cartIdSeq, restoredCart);
                  setCart(restoredCart);
                  setKotCartFingerprint(getCartFingerprint(restoredCart));
                }
              } else {
                sessionStorage.removeItem(directOrderStorageKey);
              }
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
  }, [
    sessionId,
    isDirectOrder,
    isFreshDirect,
    isTakeAway,
    isStaffOrder,
    hasTableSession,
    queryOrderId,
    queryStaffId,
    directOrderStorageKey,
    router,
  ]);

  useEffect(() => {
    setServerName(formatOrderServerName(activeOrder, currentUser));
  }, [currentUser, activeOrder]);

  const seatCount = hasTableSession
    ? Math.max(1, Math.floor(Number(sessionData?.guestCount) || 1))
    : 0;

  useEffect(() => {
    if (!hasTableSession) {
      seatAccordionInitRef.current = false;
      setActiveSeatNumber(null);
      return;
    }
    if (!seatAccordionInitRef.current) {
      seatAccordionInitRef.current = true;
      setActiveSeatNumber(1);
      return;
    }
    if (
      activeSeatNumber != null &&
      (activeSeatNumber < 1 || activeSeatNumber > seatCount)
    ) {
      setActiveSeatNumber(seatCount >= 1 ? 1 : null);
    }
  }, [hasTableSession, seatCount, activeSeatNumber]);

  useEffect(() => {
    if (!isStaffOrder || !queryStaffId || employees.length === 0) return;
    const emp = employees.find(
      (e) => String(e.id || e._id) === String(queryStaffId),
    );
    if (!emp) return;
    setSelectedStaffId(String(emp.id || emp._id));
    if (emp.name) setGuestName(emp.name);
  }, [isStaffOrder, queryStaffId, employees]);

  useEffect(() => {
    if (!isStaffOrder || selectedStaffId || employees.length === 0) return;
    if (queryStaffId) return;
    const myId = String(currentUser?._id || currentUser?.id || "");
    if (!myId) return;
    const me = employees.find((emp) => String(emp.id || emp._id) === myId);
    if (me) {
      setSelectedStaffId(String(me.id || me._id));
      if (me.name) setGuestName(me.name);
    }
  }, [isStaffOrder, employees, currentUser, selectedStaffId, queryStaffId]);

  useEffect(() => {
    if (!isStaffOrder) return;
    const emp = employees.find(
      (e) => String(e.id || e._id) === String(selectedStaffId),
    );
    setAppliedDiscount(
      buildStaffDiscountState(emp?.staffDiscount, emp?.name),
    );
    if (emp?.name) setGuestName(emp.name);
  }, [isStaffOrder, selectedStaffId, employees]);

  const fetchOrderOnly = useCallback(async () => {
    if (isNoSession) {
      const savedOrderId = sessionStorage.getItem(directOrderStorageKey);
      if (!savedOrderId) return;
      try {
        const orderRes = await fetch(
          `/api/orders/employee?orderId=${savedOrderId}`,
        );
        const orderJson = await orderRes.json();
        if (orderJson.success && orderJson.data) {
          const existingOrder = orderJson.data;
          if (!isOpenDirectOrderStatus(existingOrder)) {
            sessionStorage.removeItem(directOrderStorageKey);
            setActiveOrder(existingOrder);
            setOrderStatus(existingOrder.status);
            return;
          }
          setActiveOrder(existingOrder);
          setOrderStatus(existingOrder.status);
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
  }, [sessionId, isNoSession, directOrderStorageKey]);

  useEffect(() => {
    if (!refreshPay) return;
    fetchOrderOnly().finally(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("refreshPay");
      const qs = params.toString();
      router.replace(
        qs
          ? `/sales/orders/${sessionId}?${qs}`
          : `/sales/orders/${sessionId}`,
        { scroll: false },
      );
    });
  }, [refreshPay, fetchOrderOnly, router, sessionId, searchParams]);

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
    if (useHeadsFilter && activeHead !== "All") {
      const ph = productHeads.find((h) => h.head?.name === activeHead);
      if (ph) {
        matchesHead = ph.categories.some((c) => c.products.includes(p._id));
      } else {
        matchesHead = false;
      }
    }
    const matchesCat =
      useCategoryFilter
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
        const lineBase =
          ((Number(item.price) || 0) + customExtrasUnitTotal(item.customExtras)) *
          (Number(item.qty) || 0);
        const amount =
          t.type && t.type.toLowerCase().includes("percent")
            ? lineBase * (t.value / 100)
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
    setSelectedCustomData({});
  };

  const handleOpenOptions = (item) => {
    setSelectedProduct(item);
    setVariantQtyBySize({});
    setAddonQtyById({});
    const styles = (item.preparationStyles || []).filter(Boolean);
    setSelectedPreparationStyle(styles.length === 1 ? styles[0] : "");
    setSelectedOfferChoices([]);
    setSelectedOfferDrinks([]);
    setSelectedOfferInclusions([]);
    setSelectedProductChoices({});
    setSelectedCustomData({});
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
    setSelectedCustomData({});
    setIsOptionsModalOpen(true);
  };

  const openCustomExtraModal = (item) => {
    setCustomExtraModal({
      cartId: item.cartId || item.id,
      name: item.name || "item",
    });
    setCustomExtraName("");
    setCustomExtraPrice("");
    setCustomExtraQty("1");
  };

  const closeCustomExtraModal = () => {
    setCustomExtraModal(null);
    setCustomExtraName("");
    setCustomExtraPrice("");
    setCustomExtraQty("1");
  };

  const submitCustomExtraModal = () => {
    if (!customExtraModal) return;
    const rawName = String(customExtraName || "").trim();
    const rawPrice = customExtraPrice;
    const priceEmpty =
      rawPrice === "" || rawPrice === null || rawPrice === undefined;
    if (!rawName) {
      toast.error("Custom item name is required");
      return;
    }
    if (rawName.length > 80) {
      toast.error("Custom item name is too long (max 80 characters)");
      return;
    }
    if (priceEmpty) {
      toast.error("Custom item price is required");
      return;
    }
    const priceNum = Number(rawPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price");
      return;
    }
    const qtyNum = Math.floor(Number(customExtraQty));
    if (!Number.isFinite(qtyNum) || qtyNum < 1 || qtyNum > 99) {
      toast.error("Enter a quantity between 1 and 99");
      return;
    }
    addCustomExtraToCartItem(customExtraModal.cartId, {
      name: rawName,
      price: priceNum,
      qty: qtyNum,
    });
    closeCustomExtraModal();
    toast.success(
      qtyNum > 1 ? `Added ${rawName} ×${qtyNum}` : `Added ${rawName}`,
    );
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

  const toggleCustomDataChoice = (groupIndex, value) => {
    setSelectedCustomData((prev) => {
      const current = prev[groupIndex] || "";
      return {
        ...prev,
        [groupIndex]: current === value ? "" : value,
      };
    });
  };

  const setVariantQty = (variantKey, qty) => {
    const next = Math.max(0, Math.floor(Number(qty) || 0));
    setVariantQtyBySize((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[variantKey];
      else copy[variantKey] = next;
      return copy;
    });
  };

  const setAddonQty = (addon, qty) => {
    const next = Math.max(0, Math.floor(Number(qty) || 0));
    const addonKey = getAddonKey(addon);
    setAddonQtyById((prev) => {
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[addonKey];
      } else {
        copy[addonKey] = {
          qty: next,
          addon,
          choicesByGroup: copy[addonKey]?.choicesByGroup || {},
        };
      }
      return copy;
    });
  };

  const toggleAddonSubChoice = (addonKey, groupIndex, value) => {
    setAddonQtyById((prev) => {
      const entry = prev[addonKey];
      if (!entry) return prev;
      const current = entry.choicesByGroup?.[groupIndex] || [];
      const nextChoices = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return {
        ...prev,
        [addonKey]: {
          ...entry,
          choicesByGroup: {
            ...(entry.choicesByGroup || {}),
            [groupIndex]: nextChoices,
          },
        },
      };
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
    return (
      hasVariants ||
      hasAddons ||
      hasStyles ||
      productHasChoiceOptions(product) ||
      productHasCustomData(product)
    );
  };

  const resolveLineSeatNumber = () =>
    hasTableSession ? normalizeCartSeatNumber(activeSeatNumber) : null;

  const toggleModifiedRequest = (itemKey) => {
    setExpandedModifiedRequestKeys((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  const renderCartItemCard = (item, idx) => {
    const visibleModifier = getVisibleCartModifier(item);
    const itemKey = item.cartId || `${item.id}-${idx}`;
    const isModifiedRequestOpen = expandedModifiedRequestKeys.has(itemKey);
    return (
      <div
        key={itemKey}
        className="bg-white rounded-lg p-3 border border-zinc-400 shadow-sm"
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
              {item.size && item.size !== "Standard" ? (
                <span className="text-zinc-500 font-semibold">
                  {" "}
                  ({item.size})
                </span>
              ) : null}
            </h4>
            {visibleModifier ? (
              <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                {visibleModifier}
              </p>
            ) : null}
            {!isOfferItem(item) &&
            normalizeCustomDataSelections(item.customDataSelections).length >
              0 ? (
              <div className="mt-1.5 space-y-1.5">
                {normalizeCustomDataSelections(item.customDataSelections).map(
                  (group) => (
                    <div key={`custom-${group.name}`} className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                        {group.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {group.subChoices.map((choice) => (
                          <span
                            key={`${group.name}-${choice}`}
                            className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800"
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
            {!isOfferItem(item) &&
            normalizeChoiceSelections(item.addonChoiceSelections).length >
              0 ? (
              <div className="mt-1.5 space-y-1.5">
                {normalizeChoiceSelections(item.addonChoiceSelections).map(
                  (group) => (
                    <div key={`addon-${group.name}`}>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                        {group.name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.subChoices.map((choice) => (
                          <span
                            key={`addon-${group.name}-${choice}`}
                            className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800"
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
            {!isOfferItem(item) &&
            normalizeCustomExtras(item.customExtras).length > 0 ? (
              <div className="mt-1.5 space-y-1">
                {normalizeCustomExtras(item.customExtras).map(
                  (extra, extraIdx) => {
                    const extraLine =
                      Math.round(
                        Number(extra.price) * Number(extra.qty) * 100,
                      ) / 100;
                    return (
                      <div
                        key={`${extra.name}-${extraIdx}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <p className="text-[11px] font-semibold text-zinc-600">
                          + {extra.name}
                          {extra.qty > 1 ? ` ×${extra.qty}` : ""}{" "}
                          <span className="text-zinc-500">
                            (+${extraLine.toFixed(2)})
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            removeCustomExtraFromCartItem(
                              item.cartId || item.id,
                              extraIdx,
                            )
                          }
                          className="text-[10px] font-bold text-zinc-400 hover:text-red-500"
                          aria-label={`Remove ${extra.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  },
                )}
              </div>
            ) : null}
          </div>
          <span className="font-bold text-sm text-zinc-900 shrink-0">
            ${getItemLineTotal(item).toFixed(2)}
          </span>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toggleModifiedRequest(itemKey)}
              className="inline-flex items-center border border-zinc-300 bg-zinc-50 px-2 py-1 rounded-md gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-800 hover:text-zinc-800"
              aria-expanded={isModifiedRequestOpen}
              aria-controls={`pos-cart-modified-${itemKey}`}
            >
              Modified request
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                  isModifiedRequestOpen
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-zinc-300 bg-white text-zinc-600"
                }`}
              >
                {isModifiedRequestOpen ? (
                  <Minus className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openCustomExtraModal(item)}
              className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700 hover:bg-orange-100"
            >
              <Plus className="w-3 h-3" />
              Custom item
            </button>
          </div>
          {isModifiedRequestOpen ? (
            <div id={`pos-cart-modified-${itemKey}`} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`pos-cart-note-without-${itemKey}`}
                  className="w-14 shrink-0 text-[12px] font-bold text-zinc-800"
                >
                  Without
                </label>
                <input
                  id={`pos-cart-note-without-${itemKey}`}
                  type="text"
                  value={item.noteWithout || ""}
                  onChange={(e) =>
                    updateCartItemModifiedRequest(item.cartId || item.id, {
                      noteWithout: e.target.value,
                      noteAdd: item.noteAdd || "",
                    })
                  }
                  onBlur={(e) =>
                    updateCartItemModifiedRequest(item.cartId || item.id, {
                      noteWithout: String(e.target.value || "").trim(),
                      noteAdd: String(item.noteAdd || "").trim(),
                    })
                  }
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={80}
                  placeholder="Type Here"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`pos-cart-note-add-${itemKey}`}
                  className="w-14 shrink-0 text-[12px] font-bold text-zinc-800"
                >
                  Add
                </label>
                <input
                  id={`pos-cart-note-add-${itemKey}`}
                  type="text"
                  value={item.noteAdd || ""}
                  onChange={(e) =>
                    updateCartItemModifiedRequest(item.cartId || item.id, {
                      noteWithout: item.noteWithout || "",
                      noteAdd: e.target.value,
                    })
                  }
                  onBlur={(e) =>
                    updateCartItemModifiedRequest(item.cartId || item.id, {
                      noteWithout: String(item.noteWithout || "").trim(),
                      noteAdd: String(e.target.value || "").trim(),
                    })
                  }
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={80}
                  placeholder="Type Here"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => removeFromCart(item.cartId || item.id)}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-zinc-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => updateQty(item.cartId || item.id, -1)}
              className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-zinc-700 hover:bg-zinc-50"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-sm w-4 text-center text-zinc-900">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => updateQty(item.cartId || item.id, 1)}
              className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-zinc-700 hover:bg-zinc-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
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
            customDataSelections: [],
            noteWithout: "",
            noteAdd: "",
            notes: "",
            seatNumber: resolveLineSeatNumber(),
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
    const notes = String(selection.notes ?? "").trim();

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
            noteWithout: "",
            noteAdd: "",
            productType: "KITCHEN",
            isOffer: true,
            inclusions,
            choices,
            drinks,
            notes,
            seatNumber: resolveLineSeatNumber(),
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
        notes: "",
      });
      if (added) closeOptionsModal();
      return;
    }

    const hasVariants =
      selectedProduct.variants && selectedProduct.variants.length > 0;
    const variantEntries = Object.entries(variantQtyBySize).filter(
      ([, qty]) => qty > 0,
    );
    const addonEntries = Object.values(addonQtyById).filter(
      (entry) => entry?.qty > 0 && entry?.addon,
    );

    if (
      hasVariants &&
      variantEntries.length === 0 &&
      addonEntries.length === 0
    ) {
      toast.error("Select at least one variant");
      return;
    }

    const choiceSelections = normalizeChoiceOptions(
      selectedProduct.choiceOptions,
    )
      .map((group, index) => ({
        name: group.name,
        subChoices: selectedProductChoices[index] || [],
      }))
      .filter((group) => group.subChoices.length > 0);

    const customDataSelections = normalizeCustomData(selectedProduct.customData)
      .map((group, groupIndex) => {
        const picked = String(selectedCustomData[groupIndex] || "").trim();
        return {
          name: group.name,
          subChoices: picked ? [picked] : [],
        };
      })
      .filter((group) => group.subChoices.length > 0);

    const newLines = [];

    if (hasVariants) {
      variantEntries.forEach(([variantKey, qty]) => {
        const variant = selectedProduct.variants[Number(variantKey)];
        if (!variant) return;
        const size = variant.size;
        const unitPrice = Number(variant.price) || 0;
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
          customDataSelections,
          noteWithout: "",
          noteAdd: "",
          notes: "",
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
        customDataSelections,
        noteWithout: "",
        noteAdd: "",
        notes: "",
      });
    }

    addonEntries.forEach((entry) => {
      const addon = entry.addon;
      const unitPrice = Number(addon.price) || 0;
      const unitTax = calculateItemTax(selectedProduct, unitPrice);
      const addonChoiceSelections = buildAddonChoiceSelections(
        addon,
        entry.choicesByGroup || {},
      );
      const choiceSummary = addonChoiceSelections
        .map((group) => `${group.name}: ${group.subChoices.join(", ")}`)
        .join(" · ");
      newLines.push({
        id: selectedProduct._id,
        name: addon.name || selectedProduct.name,
        productCode: selectedProduct.productCode || "",
        category: selectedProduct.category?.name || "ITEMS",
        price: unitPrice,
        tax: unitTax,
        serviceCharge: 0,
        qty: entry.qty,
        size: "Extra",
        sizes: [],
        preparationStyle: null,
        // Kept for server-side addon pricing; display filters the duplicate name
        options: [addon.name],
        productType: selectedProduct.productType === "BAR" ? "BAR" : "KITCHEN",
        modifier: choiceSummary || undefined,
        addonChoiceSelections,
        noteWithout: "",
        noteAdd: "",
        notes: "",
      });
    });

    if (newLines.length === 0) {
      toast.error("Select a variant or extra");
      return;
    }

    const seatNumber = resolveLineSeatNumber();
    const seatedLines = newLines.map((line) => ({ ...line, seatNumber }));
    setCart((prev) => mergeCartLines(prev, seatedLines, cartIdSeq));
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

  const updateCartItemModifiedRequest = (id, { noteWithout, noteAdd }) => {
    const nextWithout = String(noteWithout ?? "");
    const nextAdd = String(noteAdd ?? "");
    setCart((prev) =>
      prev.map((item) =>
        item.id === id || item.cartId === id
          ? {
              ...item,
              noteWithout: nextWithout,
              noteAdd: nextAdd,
              notes: buildModifiedRequestRemark(nextWithout, nextAdd),
            }
          : item,
      ),
    );
  };

  const addCustomExtraToCartItem = (id, extra) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id && item.cartId !== id) return item;
        const nextExtras = normalizeCustomExtras([
          ...(item.customExtras || []),
          extra,
        ]);
        const basePrice = Number(item.price) || 0;
        const customSum = customExtrasUnitTotal(nextExtras);
        return {
          ...item,
          customExtras: nextExtras,
          tax: calculateItemTax(item, basePrice + customSum),
        };
      }),
    );
  };

  const removeCustomExtraFromCartItem = (id, extraIndex) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id && item.cartId !== id) return item;
        const current = normalizeCustomExtras(item.customExtras);
        const nextExtras = current.filter((_, index) => index !== extraIndex);
        const basePrice = Number(item.price) || 0;
        const customSum = customExtrasUnitTotal(nextExtras);
        return {
          ...item,
          customExtras: nextExtras,
          tax: calculateItemTax(item, basePrice + customSum),
        };
      }),
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

    if (isStaffOrder) return "Staff";
    if (isTakeAway || isLegacyNew) return "Takeaway";

    const tableNo = getDisplayTableNo();
    const guestCount = sessionData?.guestCount;
    if (tableNo && guestCount != null) {
      return `${tableNo} .${guestCount} guest${guestCount === 1 ? "" : "s"}`;
    }
    if (tableNo) return `${tableNo}`;
    if (guestCount != null) {
      return `${guestCount} guest${guestCount === 1 ? "" : "s"}`;
    }
    return "Takeaway";
  };

  const submitOrder = async ({
    partyName,
    staffForId = null,
    staffReason = null,
  }) => {
    const orderSource = isTakeAway
      ? "WALK_IN"
      : isStaffOrder
        ? "STAFF"
        : isLegacyNew
          ? "POS"
          : undefined;

    try {
      setIsSubmitting(true);
      const items = cart.map((item) => {
        const noteWithout = String(item.noteWithout || "").trim();
        const noteAdd = String(item.noteAdd || "").trim();
        const builtNotes = buildModifiedRequestRemark(noteWithout, noteAdd);
        return {
          ...item,
          noteWithout,
          noteAdd,
          notes: builtNotes || String(item.notes || "").trim(),
        };
      });
      const payload = {
        items,
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
        const syncedCart = json.data.items?.length
          ? buildCartFromOrderItems(json.data.items)
          : cart;
        syncCartIdSeqFromItems(cartIdSeq, syncedCart);
        setCart(syncedCart);
        setKotCartFingerprint(getCartFingerprint(syncedCart));
        if (json.data.discountCode) {
          setAppliedDiscount({
            code: json.data.discountCode,
            value: Number(json.data.discountTotal || 0),
            type: "$",
          });
        }

        if (isDirectOrder && json.data._id) {
          sessionStorage.setItem(directOrderStorageKey, json.data._id);
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
          if (json.data.restaurantName) {
            setRestaurantDetails((prev) => ({
              ...prev,
              name: json.data.restaurantName,
            }));
          }
          setPrintType(isBarTicket ? "bar" : "kot");
          setRedirectAfterPrint(false);
          setPendingReleaseAfterPrint(false);
          setPendingLeaveAfterPrint(false);
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
      return;
    }
    setIsKitchenModalOpen(true);
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

  const subtotal = cart.reduce((sum, item) => sum + getItemLineTotal(item), 0);
  const rawTotalTax = cart.reduce(
    (sum, item) => sum + (item.tax || 0) * item.qty,
    0,
  );
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "%"
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  const taxableRatio =
    subtotal > 0 ? Math.max(0, subtotal - discountAmount) / subtotal : 1;
  const totalTax = Math.round(rawTotalTax * taxableRatio * 100) / 100;
  const total = Math.max(0, subtotal - discountAmount + totalTax);

  const cartFingerprintNow = getCartFingerprint(cart);
  const hasUnsentCartChanges =
    cart.length > 0 &&
    (kotCartFingerprint == null ||
      kotCartFingerprint !== cartFingerprintNow);
  // KOT is "sent" only when the live cart still matches what was last ticketed.
  // New seat items must re-enable Kitchen / KOT even if an earlier seat was paid.
  const hasSentKot =
    Boolean(activeOrder) &&
    orderStatus !== "Draft" &&
    !hasUnsentCartChanges;
  const serverMarkedPaid =
    orderStatus === "PAID" ||
    String(activeOrder?.paymentStatus || "").toUpperCase() === "PAID";
  // Stay "paid" in the UI only while there is nothing new to send to kitchen.
  const isPaid = serverMarkedPaid && !hasUnsentCartChanges;
  const isPartialPay =
    String(activeOrder?.paymentStatus || "").toUpperCase() === "PARTIAL" ||
    (serverMarkedPaid && hasUnsentCartChanges);
  const canCollectPayment = canPayFromCreateOrder(currentUser?.role);
  const canPay =
    hasSentKot &&
    cart.length > 0 &&
    !isPaid &&
    canCollectPayment;
  const unsettledSeatNumbers = getUnsettledSeatNumbers({
    items: activeOrder?.items || cart,
    paymentSplits: activeOrder?.paymentSplits,
  });
  const hasUnsettledSeatsWithItems = unsettledSeatNumbers.length > 0;
  /** Pay Now / Pay remaining — any unpaid seat with KOT items (empty seats ignored). */
  const canPayBill = canPay && hasUnsettledSeatsWithItems;

  // After KOT, persisted order totals are authoritative (server reprices items).
  const billingSubtotal =
    hasSentKot && activeOrder?.subTotal != null
      ? Number(activeOrder.subTotal)
      : subtotal;
  const billingTaxTotal =
    hasSentKot && activeOrder?.taxTotal != null
      ? Number(activeOrder.taxTotal)
      : totalTax;
  const billingDiscount =
    hasSentKot && activeOrder?.discountTotal != null
      ? Number(activeOrder.discountTotal)
      : discountAmount;
  const billingTotal = billingSubtotal - billingDiscount + billingTaxTotal;

  const buildPaymentReturnTo = () =>
    hasTableSession
      ? `/sales/orders/${sessionId}`
      : `/sales/orders/${sessionId}${
          queryOrderId ? `?orderId=${queryOrderId}` : ""
        }`;

  const openPaymentModal = () => {
    if (orderStatus === "PAID" || isPaid) return;

    // Only Manager / Master Terminal (and admin) may pay from Create Order
    if (!canPayFromCreateOrder(currentUser?.role)) {
      toast.error("Payments must be completed at the main counter.");
      return;
    }

    if (!hasSentKot) {
      toast.error("Send the order to kitchen (KOT) before taking payment.");
      return;
    }
    if (!activeOrder?._id) {
      toast.error("Send the order to kitchen (KOT) before taking payment.");
      return;
    }
    if (!hasUnsettledSeatsWithItems) {
      toast.error("No unpaid seats with ordered items.");
      return;
    }

    // One unpaid seat left → open that seat directly; otherwise settle remaining balance.
    if (isPartialPay && unsettledSeatNumbers.length === 1) {
      openSeatPayment(unsettledSeatNumbers[0]);
      return;
    }

    const q = new URLSearchParams();
    if (hasTableSession && sessionId) q.set("sessionId", String(sessionId));
    q.set("returnTo", buildPaymentReturnTo());
    if (isPartialPay) q.set("remaining", "1");
    router.push(`/sales/payment/${activeOrder._id}?${q.toString()}`);
  };

  const openSeatPayment = (seatNumber) => {
    if (isPaid) return;
    if (!canPayFromCreateOrder(currentUser?.role)) {
      toast.error("Payments must be completed at the main counter.");
      return;
    }
    if (!hasSentKot || !activeOrder?._id) {
      toast.error("Send the order to kitchen (KOT) before taking payment.");
      return;
    }
    if (isSeatSettled(activeOrder?.paymentSplits, seatNumber, activeOrder)) {
      toast.error(`${formatSeatLabel(seatNumber)} has already been paid.`);
      return;
    }
    const q = new URLSearchParams();
    if (hasTableSession && sessionId) q.set("sessionId", String(sessionId));
    q.set("returnTo", buildPaymentReturnTo());
    q.set("seat", seatNumber == null ? "table" : String(seatNumber));
    router.push(`/sales/payment/${activeOrder._id}?${q.toString()}`);
  };

  const confirmReleaseSeat = async () => {
    if (!seatReleaseTarget || !activeOrder?._id || !sessionId) return;
    setIsReleasingSeat(true);
    try {
      const res = await fetch("/api/sales/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "RELEASE_SEAT",
          orderId: activeOrder._id,
          seatNumber:
            seatReleaseTarget.seatNumber == null
              ? "table"
              : seatReleaseTarget.seatNumber,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Could not release seat");
        return;
      }
      toast.success(`${seatReleaseTarget.label} released`);
      setActiveOrder((prev) =>
        prev
          ? {
              ...prev,
              releasedSeats:
                json.data?.releasedSeats ||
                [
                  ...(Array.isArray(prev.releasedSeats)
                    ? prev.releasedSeats
                    : []),
                  seatReleaseTarget.seatNumber,
                ],
            }
          : prev,
      );
      setSeatReleaseTarget(null);
    } catch {
      toast.error("Could not release seat");
    } finally {
      setIsReleasingSeat(false);
    }
  };

  const goToTakeAwayHub = () => {
    router.push("/sales/take-away");
  };

  const goToStaffHub = () => {
    router.push("/sales/staff");
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
      router.push(`/floor?floor=${encodeURIComponent(floorId)}`);
      return;
    }
    router.push("/floor");
  };

  const leaveAfterDirectPay = () => {
    sessionStorage.removeItem(directOrderStorageKey);
    setCart([]);
    setActiveOrder(null);
    setOrderStatus("Draft");
    setOrderNote("");
    if (isTakeAway) {
      goToTakeAwayHub();
      return;
    }
    if (isStaffOrder) {
      goToStaffHub();
      return;
    }
    goToFloor();
  };

  const handleReleaseTable = async (shouldRelease) => {
    persistSalesFloorId(
      sessionFloorIdRef.current || sessionData?.floorId || sessionData?.floor,
    );
    if (!shouldRelease || isNoSession) {
      setIsReleaseModalOpen(false);
      if (isDirectOrder) {
        leaveAfterDirectPay();
        return;
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
    if (isDirectOrder) {
      sessionStorage.removeItem(directOrderStorageKey);
      setActiveOrder(null);
      setOrderStatus("Draft");
      if (!isStaffOrder) {
        setGuestName("");
        setGuestPhone("");
        setGuestEmail("");
      } else if (!queryStaffId && !selectedStaffId) {
        setGuestName("");
      }
    }
    setIsClearOrderModalOpen(false);
  };

  const menuPanelWidth =
    panelLayout === "3" ? "flex-1 min-w-0" : "w-[65%]";
  const cartPanelWidth =
    panelLayout === "3" ? "w-[32%] min-w-[280px] max-w-[420px]" : "w-[35%]";

  const layoutSummaryLabel = (() => {
    const panels = panelLayout === "3" ? "3 panels" : "2 panels";
    return `${panels} · ${gridCols} columns`;
  })();

  const renderLayoutControls = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-primary px-2.5 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-primary/90"
          title="Layout options"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Layout
          <span className="hidden sm:inline font-semibold text-white">
            · {layoutSummaryLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-white">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">
          Screens
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setPanelLayoutMode("2")}
          className="font-semibold"
        >
          <Columns2 className="h-4 w-4" />
          2 panels
          {panelLayout === "2" ? (
            <Check className="ml-auto h-4 w-4 text-orange-600" />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setPanelLayoutMode("3")}
          className="font-semibold"
        >
          <Columns3 className="h-4 w-4" />
          3 panels
          {panelLayout === "3" ? (
            <Check className="ml-auto h-4 w-4 text-orange-600" />
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">
          Product columns
        </DropdownMenuLabel>
        {[2, 3, 4].map((n) => (
          <DropdownMenuItem
            key={n}
            onClick={() => setGridCols(n)}
            className="font-semibold"
          >
            {n} columns
            {gridCols === n ? (
              <Check className="ml-auto h-4 w-4 text-black" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCategoriesSidebar = () => (
    <div className="w-[250px] shrink-0 flex flex-col border-r border-zinc-200 bg-white">
      <div className="px-3 py-3 border-b border-zinc-200 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
          Categories
        </p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`w-full px-3 py-5 text-left border-b border-zinc-800 gap-2 items-center transition-colors border-l-4 ${
                isActive
                  ? "border-l-orange-500 bg-orange-50 text-orange-800"
                  : "border-l-transparent text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <span className="text-[14px] font-bold leading-tight line-clamp-2">
                {cat}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderHeadsChips = () => (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-zinc-200 shrink-0 overflow-x-auto custom-scrollbar">
      {heads.map((head) => {
        const isActive = activeHead === head.name;
        const imageUrl = head.image?.url;
        return (
          <button
            key={head._id}
            type="button"
            onClick={() => setActiveHead(head.name)}
            className={`flex flex-col items-center justify-center min-w-[72px] rounded-lg transition-all border px-1 py-1.5 ${
              isActive
                ? "border-orange-500 shadow-sm ring-2 ring-orange-500 bg-orange-50 text-orange-700"
                : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:border-zinc-300"
            }`}
          >
            {imageUrl ? (
              <span className="relative block w-[64px] h-[40px] rounded-md overflow-hidden bg-zinc-200 shrink-0">
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="flex items-center justify-center w-[64px] h-[40px] shrink-0">
                {getHeadIcon(head.name)}
              </span>
            )}
            <span className="mt-1 px-0.5 text-[10px] font-black uppercase tracking-wider text-center leading-tight">
              {head.name}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderOfferCard = (offer) => {
    const basePrice = Number(offer.price) || 0;
    const taxAmount = calculateOfferTax(offer, basePrice);
    const totalPrice =
      Number(offer.totalPrice) > 0
        ? Number(offer.totalPrice)
        : basePrice + taxAmount;
    const hasOptions = offerNeedsOptions(offer);
    const imageUrl = offer.image?.url || null;
    const theme = getTileTheme(offer._id || offer.name);

    return (
      <button
        key={offer._id}
        type="button"
        onClick={() => addOfferFromList(offer)}
        className={`relative flex flex-col items-stretch overflow-hidden rounded-xl border-2 text-left shadow-sm transition-colors ${theme.bg}`}
      >
        {imageUrl ? (
          <span className="relative block w-full aspect-[16/15] shrink-0 bg-zinc-100 border-b border-zinc-200/80">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain p-1"
            />
          </span>
        ) : null}
        <span
          className={`absolute top-1.5 left-1.5 z-10 text-[10px] font-black uppercase tracking-wide rounded px-1.5 py-0.5 ${theme.code}`}
        >
          Offer
        </span>
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-1.5 px-2.5 py-2 ${
            imageUrl ? "" : "min-h-[96px] pt-7"
          }`}
        >
          <span className="text-[13px] font-extrabold text-zinc-900 text-center leading-snug line-clamp-2">
            {offer.name}
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-black tabular-nums text-orange-600">
              ${totalPrice.toFixed(2)}
            </span>
            {hasOptions ? (
              <span className="rounded-md bg-orange-500 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-white">
                Options
              </span>
            ) : (
              <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Add
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderProductCard = (product) => {
    const hasOptions = productNeedsOptions(product);
    const isAvailable = product.inStock !== false;
    const basePrice =
      product.variants && product.variants.length > 0
        ? product.variants[0].price
        : product.price || 0;
    const imageUrl = product.salesImage?.url || null;
    const onAdd = () =>
      hasOptions ? handleOpenOptions(product) : addToCart(product);
    const theme = getTileTheme(product._id || product.name);
    const code = String(product.productCode || "").trim();

    return (
      <button
        key={product._id}
        type="button"
        disabled={!isAvailable}
        onClick={onAdd}
        className={`relative flex flex-col items-stretch overflow-hidden rounded-xl border-2 text-left shadow-sm transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${theme.bg}`}
      >
        {imageUrl ? (
          <span className="relative block w-full aspect-[16/10] shrink-0 bg-zinc-100 border-b border-zinc-200/80">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </span>
        ) : null}
        {!isAvailable ? (
          <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-black bg-red-600 text-white rounded px-1.5 py-0.5">
            Out
          </span>
        ) : null}
        <div
          className={`flex flex-1 flex-col items-start justify-center gap-1.5 px-2.5 py-3 ${
            imageUrl ? "" : "min-h-[96px]"
          }`}
        >
          <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-zinc-900 text-left leading-snug line-clamp-2 py-1">
            {code ? (
              <span className="shrink-0 text-white bg-orange-500 border border-orange-800 rounded-md px-1 py-0.5 text-[11px]">
                {code}
              </span>
            ) : null}
            <span className="min-w-0">{product.name}</span>
          </span>
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-base font-black tabular-nums text-orange-600">
              ${Number(basePrice).toFixed(2)}
            </span>
            {hasOptions ? (
              <span className="rounded-md bg-orange-500 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-white">
                Options
              </span>
            ) : (
              <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Add
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderMenuItems = () => {
    if (activeHead === "Offer") {
      if (filteredOffers.length === 0) {
        return (
          <p className="col-span-full text-sm text-zinc-500 text-center py-10">
            No active offers available.
          </p>
        );
      }
      return filteredOffers.map((offer) => renderOfferCard(offer));
    }
    if (filteredProducts.length === 0) {
      return (
        <p className="col-span-full text-sm text-zinc-500 text-center py-10">
          No products found.
        </p>
      );
    }
    return filteredProducts.map((product) => renderProductCard(product));
  };

  if (isLoading) {
    return (
      <CreateOrderSkeleton
        panelLayout={panelLayout}
        gridCols={gridCols}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full bg-zinc-50 font-sans overflow-hidden border border-zinc-200 rounded-xl shadow-sm">
      {/* SPLIT PANELS */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* CATEGORIES SIDEBAR (3-PANEL) */}
        {panelLayout === "3" ? renderCategoriesSidebar() : null}

        {/* MENU PANEL */}
        <div
          className={`${menuPanelWidth} flex flex-col border-r border-zinc-200 bg-zinc-50`}
        >
          {/* MENU HEADER */}
          <div className="flex flex-col gap-2 px-4 py-3 bg-white border-b border-zinc-200 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {isTakeAway ? (
                  <button
                    type="button"
                    onClick={goToTakeAwayHub}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    aria-label="Back to takeaway orders"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : null}
                {isStaffOrder ? (
                  <button
                    type="button"
                    onClick={goToStaffHub}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    aria-label="Back to staff orders"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <div className="min-w-0">
                  <h2 className="text-[17px] font-black text-zinc-900">
                    Create Order
                  </h2>
                  <p className="mt-0.5 truncate text-xs font-semibold text-zinc-800">
                    {isTakeAway
                      ? "Takeaway Customer"
                      : isStaffOrder
                        ? guestName
                          ? `Staff · ${guestName}`
                          : "Staff Order"
                        : isLegacyNew
                          ? guestTable
                            ? `${guestTable} . Takeaway`
                            : "Takeaway"
                          : getDisplayTableNo() || "Loading table..."}
                  </p>
                </div>
              </div>
              {renderLayoutControls()}
            </div>
          </div>

          {/* Search (+ category dropdown in 2-PANEL) */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-zinc-200 shrink-0">
            <div className="relative w-full min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-10 bg-zinc-50 border-zinc-200 rounded-lg text-sm font-semibold focus-visible:ring-blue-500"
              />
            </div>
            {useCategoryNav ? (
              <div className="w-56 shrink-0">
                <Select
                  value={activeCategory}
                  onValueChange={setActiveCategory}
                >
                  <SelectTrigger className="w-full h-10 bg-white border-zinc-200 rounded-lg font-bold text-zinc-900 focus:ring-blue-500">
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
            ) : null}
          </div>

          {/* Heads under search (2 + 3 panel) — images shown by default when available */}
          {useHeadsNav ? renderHeadsChips() : null}

          <div className="flex-1 bg-zinc-50/50 overflow-y-auto custom-scrollbar">
            <div className={productGridClass}>{renderMenuItems()}</div>
          </div>
        </div>

        {/* RIGHT PANEL (LIVE CART) */}
        <div className={`${cartPanelWidth} flex flex-col bg-white`}>
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
              {isPaid && (
                <span className="ml-1.5 px-2 py-0.5 text-[11px] font-black rounded-md bg-emerald-100 text-emerald-800 tracking-wide">
                  PAID
                </span>
              )}
            </div>
            {isPaid && hasTableSession ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-bold text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 shadow-none"
                onClick={() => setIsReleaseModalOpen(true)}
              >
                Release Table
              </Button>
            ) : (
              <button
                className="text-red-500 hover:text-red-600 text-[13px] font-bold disabled:opacity-50"
                onClick={() => setIsClearOrderModalOpen(true)}
                disabled={cart.length === 0}
              >
                Clear All
              </button>
            )}
          </div>
          <div className="flex-1 bg-zinc-50 overflow-y-auto custom-scrollbar">
            <div className="p-3 space-y-3">
              {isStaffOrder && guestName ? (
                <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                  <User className="h-4 w-4 shrink-0 text-indigo-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                      Staff member
                    </p>
                    <p className="truncate text-sm font-extrabold text-indigo-950">
                      {guestName}
                    </p>
                  </div>
                </div>
              ) : null}

              {hasTableSession && seatCount > 0 ? (
                <div className="space-y-2">
                  {[
                    { seatNumber: null, label: formatSeatAccordionLabel(null) },
                    ...Array.from({ length: seatCount }, (_, i) => ({
                      seatNumber: i + 1,
                      label: formatSeatAccordionLabel(i + 1),
                    })),
                  ].map((section) => {
                    const isOpen =
                      normalizeCartSeatNumber(activeSeatNumber) ===
                      normalizeCartSeatNumber(section.seatNumber);
                    const style = getSeatAccordionStyle(section.seatNumber);
                    const sectionItems = cart.filter(
                      (i) =>
                        normalizeCartSeatNumber(i.seatNumber) ===
                        normalizeCartSeatNumber(section.seatNumber),
                    );
                    const sectionQty = sectionItems.reduce(
                      (s, i) => s + (Number(i.qty) || 0),
                      0,
                    );
                    const seatSettled = isSeatSettled(
                      activeOrder?.paymentSplits,
                      section.seatNumber,
                      activeOrder,
                    );
                    const seatReleased = isSeatReleased(
                      activeOrder?.releasedSeats,
                      section.seatNumber,
                    );
                    // After re-order on a released seat, remaining due reopens Pay.
                    const showReleasedBadge = seatReleased && seatSettled;
                    const canPayThisSeat =
                      canPay && sectionQty > 0 && !seatSettled;
                    const canReleaseThisSeat =
                      canCollectPayment &&
                      hasTableSession &&
                      seatSettled &&
                      !seatReleased;
                    return (
                      <div
                        key={section.label}
                        className="rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm"
                      >
                        <div
                          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${style.header}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSeatNumber(
                                normalizeCartSeatNumber(section.seatNumber),
                              )
                            }
                            className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left"
                          >
                            <span className="text-sm font-black tracking-wide">
                              {section.label}
                              {showReleasedBadge ? (
                                <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider opacity-90">
                                  Released
                                </span>
                              ) : seatSettled ? (
                                <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider opacity-90">
                                  Paid
                                </span>
                              ) : null}
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              {sectionQty > 0 ? (
                                <span
                                  className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center ${style.badge}`}
                                >
                                  {sectionQty}
                                </span>
                              ) : null}
                              {isOpen ? (
                                <ChevronUp className="w-5 h-5 opacity-90" />
                              ) : (
                                <ChevronDown className="w-5 h-5 opacity-90" />
                              )}
                            </span>
                          </button>
                          {canPayThisSeat ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSeatPayment(section.seatNumber);
                              }}
                              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-emerald-700 shadow-md hover:bg-emerald-50"
                            >
                              Pay
                            </button>
                          ) : canReleaseThisSeat ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSeatReleaseTarget({
                                  seatNumber: section.seatNumber,
                                  label: section.label,
                                });
                              }}
                              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-orange-700 shadow-md hover:bg-orange-50"
                            >
                              Release
                            </button>
                          ) : null}
                        </div>
                        {isOpen ? (
                          <div className="bg-zinc-50/80 p-2.5 space-y-2">
                            {sectionItems.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-zinc-400 px-3">
                                <p className="font-bold text-sm text-zinc-900">
                                  No items added
                                </p>
                                <p className="text-xs font-semibold mt-1 text-center">
                                  Tap a menu item to add to{" "}
                                  {section.seatNumber == null
                                    ? "Table"
                                    : `Seat ${section.seatNumber}`}
                                  .
                                </p>
                              </div>
                            ) : (
                              sectionItems.map((item, idx) =>
                                renderCartItemCard(item, idx),
                              )
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : cart.length === 0 ? (
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
                  {cart.map((item, idx) => renderCartItemCard(item, idx))}
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
                <span className="text-zinc-900">
                  ${(hasSentKot ? billingSubtotal : subtotal).toFixed(2)}
                </span>
              </div>
              {(hasSentKot ? billingDiscount : discountAmount) > 0 && (
                <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>
                    {(() => {
                      const curDisc = hasSentKot
                        ? billingDiscount
                        : discountAmount;
                      const curSub = hasSentKot ? billingSubtotal : subtotal;
                      const curPct =
                        curSub > 0 && curDisc > 0
                          ? Math.round((curDisc / curSub) * 1000) / 10
                          : null;
                      if (curPct != null && curPct > 0) {
                        return `Discount (${curPct}%)`;
                      }
                      if (curDisc > 0) {
                        return `Discount ($${curDisc.toFixed(2)})`;
                      }
                      return "Discount";
                    })()}
                  </span>
                  <span>
                    -$
                    {(hasSentKot ? billingDiscount : discountAmount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-500">
                <span>
                  {(() => {
                    const curTax = hasSentKot ? billingTaxTotal : totalTax;
                    const curSub = hasSentKot ? billingSubtotal : subtotal;
                    const curDisc = hasSentKot
                      ? billingDiscount
                      : discountAmount;
                    const taxable = Math.max(0, curSub - curDisc);
                    const rate =
                      taxable > 0 && curTax > 0
                        ? Math.round((curTax / taxable) * 1000) / 10
                        : null;
                    return rate != null && rate > 0 ? `HST (${rate}%)` : "HST";
                  })()}
                </span>
                <span className="text-zinc-900">
                  ${(hasSentKot ? billingTaxTotal : totalTax).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-100">
                <span className="text-base font-bold text-zinc-900">Total</span>
                <span className="text-2xl font-black text-zinc-900 leading-none">
                  ${(hasSentKot ? billingTotal : total).toFixed(2)}
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
              {isPaid && hasTableSession ? (
                <Button
                  onClick={() => setIsReleaseModalOpen(true)}
                  disabled={isReleasingTable}
                  className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-none"
                >
                  {isReleasingTable ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Release Table"
                  )}
                </Button>
              ) : canCollectPayment ? (
                <Button
                  onClick={openPaymentModal}
                  disabled={!canPayBill}
                  className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-none disabled:opacity-50"
                >
                  {isPaid
                    ? "Paid"
                    : isPartialPay
                      ? "Pay remaining seats"
                      : "Pay Now"}
                </Button>
              ) : (
                <Button
                  onClick={() => router.push("/sales/today")}
                  className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-none"
                >
                  Go to Orders
                </Button>
              )}
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
                  {isTakeAway ? "Bill under whose name?" : "Party Name"}
                </h2>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">
                  {isTakeAway
                    ? "Optional — leave blank to use Takeaway."
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
              {(() => {
                const isOffer = isOfferItem(selectedProduct);
                const offerInclusions = cleanOfferList(
                  selectedProduct.inclusions,
                );
                const offerChoices = cleanOfferList(selectedProduct.choices);
                const offerDrinks = cleanOfferList(selectedProduct.drinks);
                const productCustomDataGroups = normalizeCustomData(
                  selectedProduct.customData,
                );
                const productChoiceGroups = normalizeChoiceOptions(
                  selectedProduct.choiceOptions,
                );
                const hasVariants =
                  Array.isArray(selectedProduct.variants) &&
                  selectedProduct.variants.length > 0;
                const hasPrepStyles =
                  Array.isArray(selectedProduct.preparationStyles) &&
                  selectedProduct.preparationStyles.filter(Boolean).length > 0;
                const hasAddons =
                  Array.isArray(selectedProduct.addons) &&
                  selectedProduct.addons.length > 0;

                const sectionIds = isOffer
                  ? [
                      ...(offerInclusions.length > 0 ? ["inclusions"] : []),
                      ...(offerChoices.length > 0 ? ["choices"] : []),
                      ...(offerDrinks.length > 0 ? ["drinks"] : []),
                    ]
                  : [
                      ...(hasVariants ? ["variants"] : []),
                      ...(hasPrepStyles ? ["preparation"] : []),
                      ...productCustomDataGroups.map(
                        (group, i) => `custom-${i}-${group.name}`,
                      ),
                      ...productChoiceGroups.map(
                        (group, i) => `choice-${i}-${group.name}`,
                      ),
                      ...(hasAddons ? ["addons"] : []),
                    ];
                const defaultOpen = sectionIds[0] ? [sectionIds[0]] : [];
                const accordionItemClass =
                  "overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-none";
                const accordionTriggerClass =
                  "px-3 py-3 text-[13px] font-bold text-zinc-900 hover:no-underline hover:bg-zinc-50";
                const accordionContentClass = "px-3 pt-3 pb-3";
                const productKey =
                  selectedProduct._id ||
                  selectedProduct.id ||
                  selectedProduct.name ||
                  "options";

                return (
                  <Accordion
                    key={productKey}
                    type="multiple"
                    defaultValue={defaultOpen}
                    className="space-y-3"
                  >
                    {isOffer ? (
                      <>
                        {offerInclusions.length > 0 && (
                          <AccordionItem
                            value="inclusions"
                            className={accordionItemClass}
                          >
                            <AccordionTrigger
                              className={accordionTriggerClass}
                            >
                              Inclusions
                            </AccordionTrigger>
                            <AccordionContent
                              className={accordionContentClass}
                            >
                              <div className="grid gap-2">
                                {offerInclusions.map((item) => (
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
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {offerChoices.length > 0 && (
                          <AccordionItem
                            value="choices"
                            className={accordionItemClass}
                          >
                            <AccordionTrigger
                              className={accordionTriggerClass}
                            >
                              Choices
                            </AccordionTrigger>
                            <AccordionContent
                              className={accordionContentClass}
                            >
                              <div className="grid gap-2">
                                {offerChoices.map((choice) => (
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
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {offerDrinks.length > 0 && (
                          <AccordionItem
                            value="drinks"
                            className={accordionItemClass}
                          >
                            <AccordionTrigger
                              className={accordionTriggerClass}
                            >
                              Drinks
                            </AccordionTrigger>
                            <AccordionContent
                              className={accordionContentClass}
                            >
                              <div className="grid gap-2">
                                {offerDrinks.map((drink) => (
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
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </>
                    ) : (
                      <>
                        {hasVariants && (
                          <AccordionItem
                            value="variants"
                            className={accordionItemClass}
                          >
                            <AccordionTrigger
                              className={accordionTriggerClass}
                            >
                              Variants
                            </AccordionTrigger>
                            <AccordionContent
                              className={accordionContentClass}
                            >
                              <div className="flex text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 border-b border-zinc-100 pb-2 px-1 gap-1">
                                <div className="flex-1 min-w-[100px]">
                                  Option
                                </div>
                                <div className="w-20 text-center">Qty</div>
                                <div className="w-14 text-center">Base</div>
                                <div className="w-16 text-center">Discount</div>
                                <div className="w-16 text-center">Tax</div>
                                <div className="w-20 text-right">Total</div>
                              </div>
                              <div className="grid gap-2">
                                {selectedProduct.variants.map((v, idx) => {
                                  const variantKey = getVariantKey(v, idx);
                                  const qty = variantQtyBySize[variantKey] || 0;
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
                                  const unitFinal =
                                    discountedPrice + taxAmount;
                                  const lineTax = taxAmount * qty;
                                  const lineTotal = unitFinal * qty;

                                  return (
                                    <div
                                      key={variantKey}
                                      className={`border p-3 rounded-lg transition-colors gap-1 ${
                                        isChecked
                                          ? "border-orange-500 bg-orange-50/30"
                                          : "border-zinc-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <div
                                          className={`flex-1 min-w-[100px] text-[14px] font-bold ${isChecked ? "text-zinc-900" : "text-zinc-700"}`}
                                        >
                                          {v.size}
                                        </div>
                                        <div className="w-20 flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setVariantQty(variantKey, qty - 1)
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
                                              setVariantQty(variantKey, qty + 1)
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
                                          {(qty > 0
                                            ? lineTotal
                                            : unitFinal
                                          ).toFixed(2)}
                                        </div>
                                      </div>
                                      <IngredientChips
                                        ingredients={v.ingredients}
                                        label="Includes"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {hasPrepStyles && (
                          <AccordionItem
                            value="preparation"
                            className={accordionItemClass}
                          >
                            <AccordionTrigger
                              className={accordionTriggerClass}
                            >
                              Preparation Style
                            </AccordionTrigger>
                            <AccordionContent
                              className={accordionContentClass}
                            >
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
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
                                        <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800 min-w-0">
                                          <input
                                            type="radio"
                                            name="preparationStyle"
                                            checked={
                                              selectedPreparationStyle === style
                                            }
                                            onChange={() =>
                                              setSelectedPreparationStyle(style)
                                            }
                                            className="w-4 h-4 accent-orange-500 shrink-0"
                                          />
                                          <span className="truncate">
                                            {style}
                                          </span>
                                        </div>
                                      </label>
                                    ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedPreparationStyle("")
                                  }
                                  className="text-left text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-1"
                                >
                                  Clear style
                                </button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {productCustomDataGroups.map((group, groupIndex) => {
                          const value = `custom-${groupIndex}-${group.name}`;
                          return (
                            <AccordionItem
                              key={value}
                              value={value}
                              className={accordionItemClass}
                            >
                              <AccordionTrigger
                                className={accordionTriggerClass}
                              >
                                {group.name}
                              </AccordionTrigger>
                              <AccordionContent
                                className={accordionContentClass}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {group.subChoices.map((choice) => {
                                    const selected =
                                      selectedCustomData[groupIndex] === choice;
                                    return (
                                      <label
                                        key={`${group.name}-${choice}`}
                                        className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                                          selected
                                            ? "border-violet-500 bg-violet-50/30"
                                            : "border-zinc-200 hover:border-violet-300"
                                        }`}
                                      >
                                        <div className="flex-1 flex items-center gap-3 text-[14px] font-bold text-zinc-800">
                                          <input
                                            type="radio"
                                            name={`custom-data-${groupIndex}-${group.name}`}
                                            checked={selected}
                                            onChange={() =>
                                              toggleCustomDataChoice(
                                                groupIndex,
                                                choice,
                                              )
                                            }
                                            className="w-4 h-4 accent-violet-500"
                                          />
                                          <span>{choice}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}

                        {productChoiceGroups.map((group, groupIndex) => {
                          const value = `choice-${groupIndex}-${group.name}`;
                          return (
                            <AccordionItem
                              key={value}
                              value={value}
                              className={accordionItemClass}
                            >
                              <AccordionTrigger
                                className={accordionTriggerClass}
                              >
                                {group.name}
                              </AccordionTrigger>
                              <AccordionContent
                                className={accordionContentClass}
                              >
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
                                              toggleProductSubChoice(
                                                groupIndex,
                                                choice,
                                              )
                                            }
                                            className="w-4 h-4 accent-orange-500"
                                          />
                                          <span>{choice}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}

                        {hasAddons && (
                          <AccordionItem
                            value="addons"
                            className={accordionItemClass}
                          >
                            <AccordionTrigger
                              className={accordionTriggerClass}
                            >
                              Addons
                            </AccordionTrigger>
                            <AccordionContent
                              className={accordionContentClass}
                            >
                              <div className="grid gap-3">
                                {selectedProduct.addons.map((addon) => {
                                  const addonKey = getAddonKey(addon);
                                  const qty =
                                    addonQtyById[addonKey]?.qty || 0;
                                  const choicesByGroup =
                                    addonQtyById[addonKey]?.choicesByGroup ||
                                    {};
                                  const isChecked = qty > 0;
                                  const discountAmount =
                                    calculateItemDiscount(
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
                                  const unitFinal =
                                    discountedPrice + taxAmount;
                                  const lineTax = taxAmount * qty;
                                  const lineTotal = unitFinal * qty;
                                  const addonChoiceGroups =
                                    normalizeChoiceOptions(addon.choiceOptions);

                                  return (
                                    <div
                                      key={addonKey}
                                      className={`border rounded-lg transition-colors ${
                                        isChecked
                                          ? "border-orange-500 bg-orange-50/30"
                                          : "border-zinc-200"
                                      }`}
                                    >
                                      <div className="flex items-center p-3 gap-1">
                                        <div
                                          className={`flex-1 min-w-[100px] text-[14px] font-bold ${isChecked ? "text-zinc-900" : "text-zinc-700"}`}
                                        >
                                          <div>{addon.name}</div>
                                          {addon.fromCategory ? (
                                            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                              Linked from category
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="w-20 flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setAddonQty(addon, qty - 1)
                                            }
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
                                            onClick={() =>
                                              setAddonQty(addon, qty + 1)
                                            }
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
                                          {(qty > 0
                                            ? lineTotal
                                            : unitFinal
                                          ).toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="px-3 pb-2">
                                        <IngredientChips
                                          ingredients={addon.ingredients}
                                          label="Addon includes"
                                          compact
                                        />
                                      </div>
                                      {addonChoiceGroups.length > 0 && (
                                        <div className="px-3 pb-3 pt-1 space-y-4 border-t border-zinc-100/80">
                                          {addonChoiceGroups.map(
                                            (group, groupIndex) => (
                                              <div
                                                key={`${addonKey}-${group.name}-${groupIndex}`}
                                                className="space-y-2"
                                              >
                                                <span className="text-[12px] font-bold text-zinc-800 block">
                                                  {group.name}
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                  {group.subChoices.map(
                                                    (choice) => {
                                                      const selected = (
                                                        choicesByGroup[
                                                          groupIndex
                                                        ] || []
                                                      ).includes(choice);
                                                      return (
                                                        <label
                                                          key={`${addonKey}-${group.name}-${choice}`}
                                                          className={`flex items-center border p-2.5 rounded-lg cursor-pointer transition-colors ${
                                                            selected
                                                              ? "border-orange-500 bg-orange-50/30"
                                                              : "border-zinc-200 hover:border-orange-300"
                                                          }`}
                                                        >
                                                          <div className="flex-1 flex items-center gap-2 text-[13px] font-bold text-zinc-800">
                                                            <input
                                                              type="checkbox"
                                                              checked={selected}
                                                              onChange={() =>
                                                                toggleAddonSubChoice(
                                                                  addonKey,
                                                                  groupIndex,
                                                                  choice,
                                                                )
                                                              }
                                                              className="w-4 h-4 accent-orange-500"
                                                            />
                                                            <span>
                                                              {choice}
                                                            </span>
                                                          </div>
                                                        </label>
                                                      );
                                                    },
                                                  )}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </>
                    )}
                  </Accordion>
                );
              })()}
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

      {/* ADD CUSTOM ITEM MODAL */}
      {customExtraModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Add custom item
                </h3>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">
                  For {customExtraModal.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCustomExtraModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="pos-cart-custom-extra-name"
                  className="text-[12px] font-bold text-zinc-700 block"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="pos-cart-custom-extra-name"
                  value={customExtraName}
                  onChange={(e) => setCustomExtraName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Extra cheese slice"
                  className="h-11 bg-white"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="pos-cart-custom-extra-price"
                    className="text-[12px] font-bold text-zinc-700 block"
                  >
                    Price <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="pos-cart-custom-extra-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={customExtraPrice}
                    onChange={(e) => setCustomExtraPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-11 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="pos-cart-custom-extra-qty"
                    className="text-[12px] font-bold text-zinc-700 block"
                  >
                    Qty <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="pos-cart-custom-extra-qty"
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    value={customExtraQty}
                    onChange={(e) => setCustomExtraQty(e.target.value)}
                    placeholder="1"
                    className="h-11 bg-white"
                  />
                </div>
              </div>
              {(() => {
                const unit = Number(customExtraPrice);
                const qty = Math.floor(Number(customExtraQty));
                const hasUnit = Number.isFinite(unit) && unit >= 0 && customExtraPrice !== "";
                const hasQty = Number.isFinite(qty) && qty >= 1;
                if (!hasUnit || !hasQty) return null;
                const total = Math.round(unit * qty * 100) / 100;
                const nameLabel =
                  String(customExtraName || "").trim() || "Custom item";
                return (
                  <div className="rounded-xl border border-orange-100 bg-orange-50/80 px-3 py-2.5 text-sm">
                    <p className="font-semibold text-zinc-800 truncate">
                      {nameLabel}
                    </p>
                    <p className="mt-0.5 text-zinc-600 font-medium">
                      ${unit.toFixed(2)} × {qty} ={" "}
                      <span className="font-bold text-zinc-900">
                        ${total.toFixed(2)}
                      </span>
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeCustomExtraModal}
                className="flex-1 h-11 border-zinc-300 font-bold text-zinc-700 shadow-none"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitCustomExtraModal}
                className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none"
              >
                Add
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

      {seatReleaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">
                Release {seatReleaseTarget.label}?
              </h2>
              <p className="text-sm font-semibold text-zinc-500 mt-1">
                {seatReleaseTarget.label} is paid. Release only this seat so
                other guests can keep dining? The table will stay open.
              </p>
            </div>
            <div className="p-5 flex gap-2">
              <Button
                variant="outline"
                disabled={isReleasingSeat}
                onClick={() => setSeatReleaseTarget(null)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                Not now
              </Button>
              <Button
                disabled={isReleasingSeat}
                onClick={confirmReleaseSeat}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-none"
              >
                {isReleasingSeat ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Yes, release ${seatReleaseTarget.label}`
                )}
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
            <div className="p-5 flex gap-2">
              <Button
                variant="outline"
                disabled={isReleasingTable}
                onClick={() => setIsReleaseModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none text-xs sm:text-sm"
              >
                Stay on Order
              </Button>
              <Button
                variant="outline"
                disabled={isReleasingTable}
                onClick={() => handleReleaseTable(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-300 text-zinc-800 shadow-none text-xs sm:text-sm"
              >
                No, Go to Floor
              </Button>
              <Button
                disabled={isReleasingTable}
                onClick={() => handleReleaseTable(true)}
                className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none text-xs sm:text-sm"
              >
                {isReleasingTable ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Release"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal — bill / KOT / bar (same as Today Orders) */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          if (printType === "customer" && pendingReleaseAfterPrint) {
            setPendingReleaseAfterPrint(false);
            setPendingLeaveAfterPrint(false);
            setIsReleaseModalOpen(true);
            return;
          }
          if (printType === "customer" && pendingLeaveAfterPrint) {
            setPendingLeaveAfterPrint(false);
            setPendingReleaseAfterPrint(false);
            leaveAfterDirectPay();
            return;
          }
          setPendingReleaseAfterPrint(false);
          setPendingLeaveAfterPrint(false);
          if (redirectAfterPrint) {
            goToFloor();
          }
        }}
        printType={printType}
        order={printOrderData || activeOrder}
        kotItems={printKotItems}
        taxBreakdown={printTaxBreakdown}
        restaurantDetails={restaurantDetails}
        serverName={serverName}
        guestCount={
          printOrderData?.guestCount ??
          activeOrder?.guestCount ??
          sessionData?.guestCount
        }
      />
    </div>
  );
}
