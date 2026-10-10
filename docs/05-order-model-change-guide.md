# Order Model Change Guide

Hand this file to the agent (plus your new requirements) whenever you change the **Order** schema or any related order data that must stay in sync across **Sales web**, **Admin**, **Android/Mobile**, reports, EOD, payments, and printing.

**Canonical schema:** [`Web/src/models/Order.js`](../src/models/Order.js)

---

## How to use this file

1. Attach or `@` this markdown file in the chat.
2. State the change clearly (new field, rename, pricing rule, display rule, etc.).
3. Ask the agent to update **all layers** listed below that touch that field/behavior.
4. Prefer shared helpers over copy-paste logic (see **Pricing & item helpers**).

### Suggested prompt template

```text
@Web/docs/05-order-model-change-guide.md

Change: <describe Order / items / customExtras / paymentSplits / etc.>

Requirements:
- <behavior>
- <display>
- <legacy / default rules>

Update every relevant file in this guide (Web Sales, Admin, Mobile, EOD, reports, receipts, ESC/POS).
```

---

## Schema snapshot (Order)

### Identity & lifecycle

| Field | Notes |
| --- | --- |
| `restaurantId` | Tenant scope |
| `orderNumber` / `originalOrderNumber` | Unique among **active** orders |
| `invoiceNumber` / `originalInvoiceNumber` | Unique among **active** orders |
| `isActive`, `deletedAt`, `deletedBy`, `deletionReason` | Soft delete (full order) |
| `cashTenderRemovedAt`, `cashTenderRemovedBy`, `cashTenderRemovalReason`, `removedCashSnapshot` | Soft-remove cash from mixed cash+card/gift; order stays active |
| `restoredAt`, `restoredBy` | Restore |
| `permanentlyDeletedAt`, `permanentlyDeletedBy` | Hard-delete audit |
| `status` | `PENDING` \| `CONFIRMED` \| `COMPLETED` \| `PAID` \| `CANCELLED` \| `WAIVED` |
| `paymentStatus` | `UNPAID` \| `PARTIAL` \| `PAID` \| `REFUNDED` |
| `source` | `POS` \| `WALK_IN` \| `STAFF` \| `ONLINE` |
| `processedBy` | Original taker (sales/tip credit; do not reassign on pay/transfer) |
| `createdAt` / `updatedAt` | Timestamps |

### Money / totals

| Field | Notes |
| --- | --- |
| `subTotal`, `taxTotal`, `serviceChargeTotal`, `serviceChargeName` | |
| `discountTotal`, `discountCode`, `discountPercent` | |
| `giftcardCode`, `giftcardUsedAmount` | |
| `totalAmount` | Order total **before** tip |
| `tipAmount`, `tipMethod` | Tip |
| `cashAmount`, `cardAmount` | Tender aggregates |
| `taxBreakdown[]` | `{ taxId, name, rate, amount }` |
| `paymentMethod` | Display / summary string |

### Guest / table / seats

| Field | Notes |
| --- | --- |
| `partyName` | Bill party name (preferred) |
| `guestName` | Legacy; keep in sync with `partyName` |
| `guestCount` | Covers |
| `contactNumber`, `guestCountryCode`, `guestEmail` | Optional guest contact |
| `tableNo`, `table`, `floor`, `tableSession` | Location |
| `releasedSeats[]` | Paid seats cleared; session can stay open |
| `paymentSplits[]` | Multi-payer / seat splits (see below) |

### Staff / online extras

| Field | Notes |
| --- | --- |
| `staffFor`, `staffOrderReason` | Staff meals |
| `onlineApprovedAt/By`, `onlineKotSentAt/By`, `onlineReadyAt/By` | Online pickup workflow |
| `waiveReason`, `waivedAt`, `waivedBy` | Waive flow |
| `specialNote` | Order-level note |

### `paymentSplits[]`

```js
{
  name,           // payer label (prints as Party / Payer on split slips)
  amount,
  method,         // Cash | Card | Cash + Card | Gift Card
  cardType,
  tipAmount, tipMethod,
  cashAmount, cardAmount,
  paidAt,
  seatNumber,     // primary seat
  seatNumbers,    // merged seats; null entry = Table bucket
}
```

### `items[]` (OrderItem)

| Field | Notes |
| --- | --- |
| `menuItemId`, `name`, `productCode`, `category` | Catalog / display |
| `size`, `sizes`, `qty`, `price` | `price` = **base unit** (excludes custom extras) |
| `tax`, `serviceCharge` | Per-unit tax often stored; line tax × qty in some reports |
| `productType` | `KITCHEN` \| `BAR` |
| `isOffer`, `inclusions`, `choices`, `drinks` | Offers |
| `choiceSelections[]` | `{ name, subChoices[] }` |
| `customDataSelections[]` | `{ name, subChoices[] }` — **one** selected option string per group (radio) |
| `addonChoiceSelections[]` | Addon breakdown; qty labels like `"Ranch ×3"` |
| `options`, `preparationStyle`, `notes` | Modifiers / remarks |
| **`customExtras[]`** | Free-text POS extras (see next section) |
| `sentQty`, `cartId` | KOT sync / cart merge |
| `seatNumber` | `1..guestCount`; `null` = shared Table bucket |

---

## Critical pricing rule: `customExtras`

Shape:

```js
{ name: string, price: number /* unit */, qty: number /* default 1 */ }
```

**Line math (shared):**

```text
customExtrasUnitTotal = Σ (extra.price × extra.qty)
itemLineTotal         = (item.price + customExtrasUnitTotal) × item.qty
```

Rules:

- Legacy rows without `qty` → treat as `1` in normalize helpers.
- Qty range: integer **1–99**.
- Do **not** fold extra amount into `item.price`; keep base price separate.
- Cart merge keys must include normalized extras (`cartCustomExtrasKey`).

### Shared helpers (source of truth)

| Platform | File | Functions |
| --- | --- | --- |
| Web | [`Web/src/utils/productChoices.js`](../src/utils/productChoices.js) | `normalizeCustomExtras`, `customExtrasUnitTotal`, `cartCustomExtrasKey`, `getItemLineTotal`, `getReceiptModifierLines` |
| Mobile | [`Mobile/src/utils/productChoices.ts`](../../Mobile/src/utils/productChoices.ts) | same (+ `isValidCustomExtraPrice`, `isValidCustomExtraQty`) |
| Mobile receipts | [`Mobile/src/utils/receiptFormat.ts`](../../Mobile/src/utils/receiptFormat.ts) | `getReceiptModifierLines` (UI preview) |
| Web reprice | [`Web/src/lib/orders/repricePosCartItems.js`](../src/lib/orders/repricePosCartItems.js) | Server-side cart → order items |
| Web EOD tax | [`Web/src/lib/eod/buildTaxBreakdown.js`](../src/lib/eod/buildTaxBreakdown.js) | Uses `customExtrasUnitTotal` |
| Web EOD build | [`Web/src/lib/eod/buildEodReport.js`](../src/lib/eod/buildEodReport.js) | Uses `getItemLineTotal` for category/gross |

**When changing pricing:** update Web + Mobile helpers first, then ESC/POS duplicates, then UIs.

---

## File map by surface

### Required coverage directories (always check)

When updating Order-related data, walk these trees (and the files under them):

| Surface | Directory / entry |
| --- | --- |
| Sales POS cart | `Web/src/app/sales/orders/[sessionId]/page.js` |
| Sales payment | `Web/src/app/sales/payment/` |
| Sales thank-you | `Web/src/app/sales/thank-you/` |
| Sales today | `Web/src/app/sales/today/` |
| Sales today-sales | `Web/src/app/sales/today-sales/` |
| Sales print jobs | `Web/src/app/sales/print-jobs/` |
| Sales reports (EOD) | `Web/src/app/sales/reports/` |
| Admin reports | `Web/src/app/admin/reports/` |
| Mobile printer | `Mobile/src/printer/` |
| Mobile print jobs | `Mobile/src/screens/sales/print-jobs/PrintJobsScreen.tsx` (+ `components/print-jobs/`) |
| Mobile today-sales | `Mobile/src/screens/sales/today-sales/TodaySalesScreen.tsx` |
| Mobile reports / EOD | `Mobile/src/screens/sales/reports/ReportsScreen.tsx`, `EODReportScreen.tsx` |

### 1) Schema & order APIs

| Area | Paths |
| --- | --- |
| Model | `Web/src/models/Order.js` |
| Employee POS API | `Web/src/app/api/orders/employee/route.js` |
| Staff / admin APIs | `Web/src/app/api/orders/staff/route.js`, `.../staff/[id]/route.js`, `.../admin/route.js`, `.../admin/[id]/route.js` |
| Generic order | `Web/src/app/api/orders/[id]/route.js`, `.../stats/route.js` |
| Lifecycle / soft-delete | `Web/src/lib/orders/orderLifecycle.js`, `ensureOrderSoftDeleteIndexes.js`, `renumberOrdersForBusinessDay.js`, `sessionTables.js` |
| Online public | `Web/src/lib/public/createOnlineOrder.js`, `findPublicOnlineOrder.js` |

### 2) Sales web — POS cart, payment, thank-you, today

| Area | Paths |
| --- | --- |
| Order taking (cart UI) | `Web/src/app/sales/orders/[sessionId]/page.js` |
| Payment page | `Web/src/app/sales/payment/[orderId]/page.js` |
| Payment UI (shared) | `Web/src/components/sales/OrderPaymentView.jsx` |
| Thank-you | `Web/src/app/sales/thank-you/[orderId]/page.js` |
| Payments API | `Web/src/app/api/sales/payments/route.js` |
| Sessions / floor | `Web/src/app/api/sales/sessions/route.js`, `.../floor/route.js` |
| Today orders | `Web/src/app/sales/today/page.js` |
| Today sales | `Web/src/app/sales/today-sales/page.js` |

### 3) Sales web — print jobs & receipts

| Area | Paths |
| --- | --- |
| Print jobs list | `Web/src/app/sales/print-jobs/page.js` |
| Print job detail | `Web/src/app/sales/print-jobs/[id]/page.js` |
| Print job API | `Web/src/app/api/sales/print-jobs/route.js`, `.../[id]/route.js`, `.../[id]/reprint`, `.../[id]/complete` (if present) |
| Print job service | `Web/src/lib/printing/printJobService.js` |
| ESC/POS (Sales print agent) | `Web/src/lib/printing/escpos.js` |
| Receipt components | `Web/src/components/receipts/CustomerReceipt.jsx`, `KitchenOrderTicket.jsx`, `BarReceipt.jsx`, `PrintPreviewModal.jsx` |
| Reports order body | `Web/src/components/reports/OrderDetailBody.jsx` |

**Split receipts:** payer name lives on print-job `metadata.splitName` / `partyName` / `guestName` — prefer metadata over order-level `partyName` for slip Party lines.

**Bill custom-extra layout:** left label `+ Name ×qty`, right amount `+$X.XX` via `formatTwoColumnLine` (never inline after name).

### 4) Sales reports + EOD (sales & admin share lib)

| Area | Paths |
| --- | --- |
| Sales reports dir | `Web/src/app/sales/reports/` (currently `end-of-day/page.js`) |
| Admin EOD page | `Web/src/app/admin/reports/admin/eod/page.js` |
| EOD UI | `Web/src/components/eod/EodReportPage.jsx`, `EodReportPreview.jsx`, `EodEmailDialog.jsx` |
| EOD lib | `Web/src/lib/eod/buildEodReport.js`, `buildTaxBreakdown.js`, `exportEodPdf.js`, `exportEodExcel.js`, `getEodReportForDate.js`, `reconcileEod.js`, `eodHelpers.js` |
| EOD APIs | `Web/src/app/api/eod/route.js`, `pdf/route.js`, `excel/route.js`, `email/route.js`, `history/route.js`, `save/route.js` |

### 5) Admin reports (app pages + libs)

**App pages under** `Web/src/app/admin/reports/`:

| Section | Paths |
| --- | --- |
| Hub | `.../page.js` |
| Admin ops | `.../admin/page.js`, `order-management/`, `today-order/`, `eod/`, `revenue/`, `audit/`, `activity/`, `kitchen/`, `bar/`, `expenses/` |
| Financial | `.../financial/page.js`, `orders/`, `payments/`, `invoices/`, `tax/`, `tips/`, `discounts/`, `day-closing/` |
| Guests | `.../guests/page.js` |
| Day closing | `.../day-closing/page.js` |
| Orders | `.../orders/page.js` |
| Employees | `.../employees/` (sales, tips, orders, cancellations, labor, hours, …) |
| Inventory | `.../inventory/` |

**Libs (shapers — update when item/order fields change):**

| Area | Paths |
| --- | --- |
| Admin | `Web/src/lib/reports/admin/orderManagement.js`, `todayOrder.js`, `dailySummary.js`, `revenue.js`, `audit.js` |
| Employee | `Web/src/lib/reports/employeeReports.js` |
| Financial | `Web/src/lib/reports/financial/orders.js`, `orderDetail.js`, `payments.js`, `invoices.js`, `tax.js`, `tips.js`, `discounts.js`, `overview.js` |
| Guest directory | `Web/src/lib/reports/guestDirectory.js` |

Any report that shapes `items.customExtras` as `{ name, price }` only must also keep **`qty`**.

### 6) Android / Mobile

| Area | Paths |
| --- | --- |
| Types | `Mobile/src/types/cart.ts` (`CustomExtra`), `order.ts`, `receipt.ts`, `todayOrder.ts` (`TodayOrderItem`) |
| Cart store / UI | `Mobile/src/store/cartStore.ts`, `components/cart/CartItem.tsx`, `Cart.tsx`, `CreateOrderCartPane.tsx` |
| Pricing / seats | `Mobile/src/utils/productChoices.ts`, `cartPricing.ts`, `orderCartMapper.ts`, `seatHelpers.ts` |
| Order / today services | `Mobile/src/services/orderService.ts`, `todayOrdersService.ts` (**must map `customExtras` through**) |
| Today UI | `Mobile/src/screens/sales/today/TodaySales.tsx` |
| Today-sales UI | `Mobile/src/screens/sales/today-sales/TodaySalesScreen.tsx`, `components/sales/TodaySalesDetailDrawer.tsx` |
| Payment / preview | `Mobile/src/screens/sales/payment/*`, `components/payment/ReceiptPreview.tsx`, `PaymentSummary.tsx` |
| Print jobs screen | `Mobile/src/screens/sales/print-jobs/PrintJobsScreen.tsx` |
| Print jobs UI | `Mobile/src/components/print-jobs/PrintJobDetailPanel.tsx`, `PrintJobCard.tsx`, `PrintJobFilters.tsx`, `PrintJobKpiCards.tsx`, `ReprintConfirmModal.tsx`, `PrintJobStatusBadge.tsx` |
| Print job display | `Mobile/src/utils/printJobDisplay.ts` |
| **Printer folder** | `Mobile/src/printer/escpos.ts` (ticket layout / custom-extra columns), `printerService.ts` (job → print), `usbPrinter.ts`, `bluetoothPrinter.ts`, `networkPrinter.ts`, `networkScan.ts` (transport — usually unchanged unless payload changes) |
| Reports / EOD screens | `Mobile/src/screens/sales/reports/ReportsScreen.tsx`, `EODReportScreen.tsx` (consume same EOD APIs) |
| Receipts format | `Mobile/src/utils/receiptFormat.ts`, `utils/receiptSlips.ts` |

---

## Checklist: changing an Order field

Copy this into the PR / agent task:

- [ ] Update `Web/src/models/Order.js` (defaults / required / indexes if needed)
- [ ] Update create/update APIs that shape items (`employee`, `staff`, `admin`, reprice)
- [ ] Update shared pricing helpers (Web + Mobile) if money/display math changes
- [ ] Update Sales POS cart UI (`orders/[sessionId]/page.js` + mobile cart)
- [ ] Update payment + thank-you (`sales/payment/`, `sales/thank-you/`, `OrderPaymentView.jsx`)
- [ ] Update receipts + ESC/POS (web `escpos.js` + mobile `printer/escpos.ts` + `printerService.ts`)
- [ ] Update print-jobs UI (web `sales/print-jobs/` + mobile `PrintJobsScreen.tsx` + print-job components)
- [ ] Update today / today-sales (web pages + mobile screens + `todayOrdersService` — easy to drop fields)
- [ ] Update admin reports pages under `Web/src/app/admin/reports/` if they show order/item detail
- [ ] Update report shapers (`orderDetail`, `guestDirectory`, `OrderDetailBody`, admin/financial libs)
- [ ] Update EOD (`sales/reports/`, admin eod, mobile `EODReportScreen` / `ReportsScreen`, EOD libs)
- [ ] Confirm legacy docs still read (defaults / normalize)
- [ ] Smoke: add item → KOT → pay (incl. split) → thank-you → print job preview → today sales detail → EOD category totals

---

## Checklist: changing `customExtras` specifically

- [ ] Schema: `items.customExtras.{ name, price, qty }`
- [ ] `normalizeCustomExtras` / `customExtrasUnitTotal` / `getItemLineTotal` / `getReceiptModifierLines` (Web + Mobile)
- [ ] Web POS modal + cart rows (`orders/[sessionId]/page.js`)
- [ ] Mobile `CartItem` modal + cart rows + `cartStore.addCustomExtra`
- [ ] `repricePosCartItems.js` validation
- [ ] Web `escpos.js` + Mobile `escpos.ts` (`getCustomExtraPrintRows` + right-aligned amount column)
- [ ] `CustomerReceipt` / `BarReceipt` / KOT / `ReceiptPreview` / `PaymentSummary`
- [ ] Report shaping + `OrderDetailBody` + admin report pages that list items
- [ ] Mobile `todayOrdersService` + `TodaySalesDetailDrawer` + today / today-sales screens
- [ ] EOD helpers / screens — re-run category gross if math changed

---

## Checklist: changing `customDataSelections`

- [ ] Product catalog schema: `customData[]` = `{ name, subChoices: string[] }` (`Web/src/models/menu/Product.js`)
- [ ] Order item schema: `customDataSelections[]` = `{ name, subChoices: string[] }` — length 0 or 1 per group
- [ ] Product PUT sanitize (`api/menu/products/[id]/route.js`) + admin product editor
- [ ] `normalizeCustomData` / `normalizeCustomDataSelections` / `filterCustomDataSelections` / `getCustomDataDetailLines` / `cartCustomDataSelectionsKey` / `getReceiptModifierLines` (Web + Mobile)
- [ ] Sales POS select UI (radio) + cart rows (`orders/[sessionId]/page.js`)
- [ ] Online `ProductConfigModal` + `CartDrawer` detail lines
- [ ] Mobile `ModifierModal` + `CartItem` chips + types (`cart` / `order` / `receipt` / `todayOrder` / `product`)
- [ ] Web `escpos.js` + Mobile `printer/escpos.ts` + `print-bridge` (group + bullet option; no nested option→choices)
- [ ] Receipt components + today / today-sales kind styles (`custom-data` / `custom-data-item` only)
- [ ] Mobile payment `ReceiptPreview` / `PaymentSummary` + print-jobs / today paths
- [ ] Report shaping + `OrderDetailBody` (pass-through; display via `getReceiptModifierLines`)
- [ ] Re-save products that still have legacy nested `{ name, choices }` under `subChoices`

---

## Last known customDataSelections contract (reference)

```text
Catalog:  { name, subChoices: string[] }
Select:   radio — at most one option per group
Persist:  { name, subChoices: [picked] }  // length 0 or 1
Cart/UI:  "Protein: Chicken"
Receipt / ESC/POS:
  Protein:
    • Chicken
```

Update this section when the contract changes so the next handoff stays accurate.

---

## Split payment / party name (related)

- Order-level `partyName` can be table default or **last** payer.
- Each split slip’s name is `paymentSplits[].name` → print job `metadata.splitName` (+ `partyName` / `guestName`).
- Previews and ESC/POS for split receipts must prefer **job metadata** over order-level party.

Key files: `printJobService.js`, `escpos.js` / `escpos.ts`, `CustomerReceipt.jsx`, Mobile `ReceiptPreview.tsx`, `printJobDisplay.ts`, print-jobs APIs/UI.

---

## Do not

- Store custom-extra line total inside `item.price`.
- Strip unknown item fields in API mappers without checking this guide.
- Update only Web helpers and leave Mobile / ESC/POS duplicates stale.
- Assume EOD UI lists custom extras line-by-line — it aggregates via `getItemLineTotal`; still verify category totals after pricing changes.

---

## Last known customExtras contract (reference)

```text
Modal: name + unit price + qty → live total = price × qty
Persist: { name, price, qty }
Cart/UI: "+ {name} ×{qty} (+${price×qty})" when qty > 1
Customer receipt / ESC/POS bill:
  left:  "+ {name} ×{qty}"
  right: "+${price×qty}"   ← amount column (formatTwoColumnLine / flex row)
  never inline "(+$X.XX)" after the name on printed bills
KOT/bar tickets: left label only (no amount)
Parent total: (base + Σ(price×qty)) × item.qty
```

Update this section when the contract changes so the next handoff stays accurate.
