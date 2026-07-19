# 03 — Layout Patterns (Admin Panel & Customer Site)

> Structural blueprints for every page type. Combine with tokens from
> `01-design-system.md` and components from `02-component-standards.md`.
> Employee POS layouts live in `04-pos-patterns.md` — this file is Admin + Customer only.

## 1. Admin Panel App Shell

```
┌─────────────────────────────────────────────────────────────────┐
│ TOP BAR (64px height, white, border-bottom neutral-200)          │
│ [Breadcrumb]                    [Search] [🔔] [Restaurant▾] [👤▾]│
├───────────┬─────────────────────────────────────────────────────┤
│           │  PAGE CONTENT (bg neutral-50, px-8 py-8)             │
│  SIDEBAR  │                                                       │
│  260px    │                                                       │
│  brand-950│                                                       │
│  fixed    │                                                       │
│           │                                                       │
└───────────┴─────────────────────────────────────────────────────┘
```

- **Sidebar:** fixed width 260px, background `--brand-950`, full viewport height, does not scroll with content. Collapsible to 72px (icon-only) with a toggle chevron — mirrors TouchBistro's `<` collapse arrow.
- **Top bar:** 64px, white, `border-bottom: 1px solid --neutral-200`, sticky. Contains breadcrumb (left), and utility cluster (right): global search, notification bell, restaurant/location selector (future multi-location ready — dropdown even if only one location exists today), profile menu with avatar + name + role.
- **Content area:** `bg-neutral-50`, padding `32px` all sides, `max-width: 1600px` centered on ultra-wide monitors so tables/cards don't stretch absurdly.

### 1.1 Sidebar internal structure

```
[Logo/Restaurant name]          ← 64px header block, brand-900 bg
─────────────────────
  ● Dashboard                   ← nav item, 48px height
  ● Menu Management
      Categories                ← sub-item, indented 32px
      Products
      Modifiers
  ● Orders
  ● Employees
  ● Reports
  ● Settings
─────────────────────
[Collapse ‹]                    ← bottom, sticky
```

- Section groups (if used) get a `text-caption` uppercase label in `--neutral-400`-equivalent-on-dark (`--brand-100` at 60% opacity), 24px top margin from previous group.
- Active nav item: background `--brand-800`, left border 3px `--brand-500` (or a solid accent), white bold text, icon in white.
- Inactive nav item: `--brand-100`-on-dark text (a light teal-tinted white, ~80% opacity), icon matches. Hover: `--brand-900` background.
- **No orange dots, no colored bullet dots as the primary nav marker** — this is the specific issue in the current build. Hierarchy comes from indentation, icon presence, and the active-state left border, not decorative bullets.

---

## 2. Dashboard Page

```
[Page Title: "Dashboard"]                    [Date range picker ▾]

┌──────────┬──────────┬──────────┬──────────┐
│ KPI Card │ KPI Card │ KPI Card │ KPI Card │   ← 4-col grid, gap-6, p-8 each
└──────────┴──────────┴──────────┴──────────┘

┌───────────────────────────┬─────────────────┐
│ Sales Chart (large card)  │ Top Items (list) │   ← 2-col, 8:4 ratio
│                           │ Recent Orders     │
└───────────────────────────┴─────────────────┘
```

- KPI row is always first, always 4 cards on desktop: Today's Sales, Orders, Avg Order Value, Active Employees (or business-relevant equivalents) — real numbers with trend deltas, never placeholder zeros.
- Below the fold: one primary chart card (sales trend, `recharts`) at ~66% width, secondary list cards (top-selling items, recent orders, low stock alerts) at ~33% width.
- No decorative "welcome back" hero banner. TouchBistro/Toast dashboards open directly with data.

---

## 3. Module List Page (Menu, Employees, Orders, etc.)

This is the **default CRUD list pattern** — used for Menu Categories, Products, Employees, Discounts, etc.

```
[Page Title]                                      [+ Primary Add Button]
[Optional subtitle/description text]

[Tabs: Active | Draft | Archived]                 ← if the entity has states

┌─────────────────────────────────────────────────────────────────┐
│ [Search input]  [Filter ▾]  [Filter ▾]           [Export] [Bulk] │
├─────────────────────────────────────────────────────────────────┤
│ TABLE (see 02-component-standards §5)                            │
├─────────────────────────────────────────────────────────────────┤
│ [Rows per page ▾]                    [Showing 1-10 of 48] [«‹2›»]│
└─────────────────────────────────────────────────────────────────┘
```

This single pattern replaces the current build's "Create Menu Category" page, which currently mixes a create-form and a table on one flat page with no card separation. **Split them:** the create action opens a `Sheet`/`Dialog` (see component standards §8), and the list page is the table above. Do not permanently render a create form inline above every list — that's the specific pattern making the current Menu Management screen feel unfinished.

---

## 4. Create / Edit Form Page (or Sheet)

Used inside a `Sheet` (preferred, keeps list context) or as a standalone page for large entities (e.g. full Product editor with images, modifiers, pricing tiers).

```
┌─────────────────────────────────────────┐
│ [Sheet Title: "Add Product"]         [×] │
├─────────────────────────────────────────┤
│ ┌─ Card: Basic Information ────────────┐│
│ │ Label                                 ││
│ │ [Input, h-11]                         ││
│ │ Label          Label                  ││
│ │ [Input]        [Select]               ││
│ └────────────────────────────────────────┘│
│ ┌─ Card: Pricing ───────────────────────┐│
│ │ ...                                    ││
│ └────────────────────────────────────────┘│
│ ┌─ Card: Availability ──────────────────┐│
│ │ ...                                    ││
│ └────────────────────────────────────────┘│
├─────────────────────────────────────────┤
│                      [Cancel] [Save (lg)] │   ← sticky footer
└─────────────────────────────────────────┘
```

- Fields grouped into logical `Card` sections with `CardTitle` — never one continuous list of 15 ungrouped inputs.
- Two-column field grid (`grid-cols-2 gap-4`) for short fields (price, SKU, category); full-width for long fields (name, description).
- Footer with Cancel/Save is **sticky to the bottom** of the Sheet/page, always visible without scrolling — critical for long forms.
- Save button is `size="lg"`, disabled + spinner while submitting, and the entire form is validated with `zod` before submit (inline errors, not just a toast).

---

## 5. Settings Page

```
┌───────────┬─────────────────────────────────────┐
│ Settings   │  [Section Title]                     │
│ nav (left) │  ┌─ Card ────────────────────────┐   │
│  General   │  │  Setting row: label + control  │   │
│  Tax       │  │  Setting row: label + control  │   │
│  Hours     │  └─────────────────────────────────┘   │
│  Closure   │                                       │
│  Devices   │                              [Save]   │
└───────────┴─────────────────────────────────────┘
```

- Left sub-nav (200px) for settings categories, distinct from the main sidebar — this is standard in Toast/Square settings.
- Each settings section is its own `Card`, with individual "Save" scoped to that card where possible, rather than one giant unscoped save button for 10 unrelated settings.
- **Restaurant Closure** settings (new business requirement) live here: toggle for Holiday/Maintenance mode, with sub-toggles for "Disable online ordering" and "Disable employee ordering" — Admin access always remains on regardless of closure state. Show a persistent amber banner across Admin (not blocking) when closure mode is active.

---

## 6. Reports Page

```
[Page Title: "Reports"]        [Date range] [Export CSV]

[Tabs: Sales | Labor | Menu Performance | Employees]

┌───────────────────────────────────────────┐
│ Chart card (full width)                     │
└───────────────────────────────────────────┘
┌───────────────────────────────────────────┐
│ Detail table (sortable, exportable)         │
└───────────────────────────────────────────┘
```

- Date range picker is always top-right, persists across report tabs.
- Every report has both a visual (chart) and a tabular breakdown — never chart-only.

---

## 7. Dialogs (confirmations, quick actions)

```
┌───────────────────────────┐
│ [Icon] Delete Employee?    │
│ This action cannot be      │
│ undone. Gloria Pear will   │
│ be permanently removed.    │
│                             │
│         [Cancel] [Delete]  │
└───────────────────────────┘
```

- Max width 420px, centered, `radius-md`, `shadow-dropdown`.
- Destructive dialogs: danger icon top-left of title, destructive button is `variant="destructive"`, cancel is `variant="outline"`.

---

## 8. Customer Website (Public)

Distinct visual register from Admin — this is public-facing, warmer, appetite-driven, but still **not a generic startup landing page**. No pricing-table sections, no "Trusted by" logo rows, no SaaS hero patterns.

```
/            → Hero (restaurant photo + name + "Order Now" / "View Menu"), featured items, location/hours, contact strip
/menu        → Category tabs (sticky) + item grid, search, cart drawer (slide-in from right)
/contact     → Map, hours, phone, address, simple contact form
/privacy-policy, /terms → Plain long-form document layout, single column, max-width 720px, generous line-height for reading
```

- Menu page: category tabs sticky under the header on scroll (like a real restaurant ordering site), item cards show photo, name, short description, price — `radius-lg`, real food photography, no icon placeholders.
- Cart: slide-in drawer from the right, persists across navigation (client-side state), cash-only checkout confirmation (no payment form fields since there's no gateway).
- Typography here can use a secondary display serif or rounded sans for the restaurant's brand personality on the hero **only** — menu/contact/legal pages stay on the standard `Inter` system for legibility.

---

## 9. Grid & Breakpoints

| Breakpoint | Width | Admin behavior | Customer behavior |
|---|---|---|---|
| `mobile` | <768px | Not primary target; sidebar becomes off-canvas drawer | Full mobile layout, single column |
| `tablet` | 768–1279px | Sidebar collapses to icon rail (72px); KPI grid → 2 cols | 2-column menu grid |
| `desktop` | ≥1280px | Full layout as specified above | 3–4 column menu grid, max-width 1200px centered |
