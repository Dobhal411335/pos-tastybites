# 01 — Design System (Source of Truth)

> This document is LAW. Every page, every component, every spacing value in this
> project must trace back to a token defined here. If a value is not defined here,
> it does not exist — do not invent it, come back and add it here first.

## 0. Design Philosophy

This is **enterprise restaurant POS software**, not a SaaS dashboard, not a
marketing site, not a startup admin template.

**Reference products:** TouchBistro, Toast POS, Square for Restaurants, Clover POS, Lightspeed Restaurant.

**Non-negotiable rules:**
1. Restaurant staff use this 8–12 hours a day, often on their feet, often on a tablet. Legibility and speed beat visual cleverness every time.
2. No gradients. No glassmorphism. No decorative illustrations. No hero sections. No marketing copy tone ("Supercharge your...").
3. No card ever exists just to hold whitespace. Every card carries data or an action.
4. Density is a feature, not a bug — but density must never come from shrinking type below the floor sizes in this doc. Density comes from tight, consistent spacing and good table/list design.
5. Every interactive element assumes a person may be tapping it on a tablet, even in the desktop-first Admin Panel. Nothing under the minimum touch target (see §5).
6. If a generated page could be mistaken for a generic admin dashboard template (Tailwind UI freebie, shadcn demo, AI-default SaaS), it has failed. It must look like restaurant software.

---

## 1. Color Tokens

Define these as CSS variables in `globals.css` and map them in `tailwind.config`.
**Never use raw hex values in components** — always reference the token.

### 1.1 Brand / Primary (Sidebar, primary actions)

| Token | Hex | Usage |
|---|---|---|
| `--brand-950` | `#0B2E38` | Sidebar background (darkest) |
| `--brand-900` | `#0F3D48` | Sidebar hover row |
| `--brand-800` | `#14505E` | Sidebar active item background |
| `--brand-700` | `#1A6577` | Primary button hover |
| `--brand-600` | `#0F6E7D` | **Primary button / primary actions** |
| `--brand-500` | `#12879A` | Links, active tab underline, focus accents |
| `--brand-100` | `#E3F3F5` | Primary-tint backgrounds (selected row, info banner) |

### 1.2 Neutrals (text, borders, surfaces)

| Token | Hex | Usage |
|---|---|---|
| `--neutral-0` | `#FFFFFF` | Page/card surfaces |
| `--neutral-50` | `#F7F8F9` | App background (behind cards) |
| `--neutral-100` | `#EEF0F2` | Table header background, dividers-heavy zones |
| `--neutral-200` | `#E2E5E9` | Borders (default) |
| `--neutral-300` | `#CBD0D6` | Borders (stronger), disabled fills |
| `--neutral-400` | `#9AA2AC` | Placeholder text, disabled text |
| `--neutral-500` | `#6B7280` | Secondary/help text |
| `--neutral-600` | `#4B5563` | Body text (secondary emphasis) |
| `--neutral-800` | `#1F2937` | Body text (primary) |
| `--neutral-950` | `#0D1117` | Headings, highest-emphasis text |

### 1.3 Semantic / Status

| Token | Hex | Usage |
|---|---|---|
| `--success-600` | `#15803D` | Active / Paid / Synced badges |
| `--success-100` | `#DCFCE7` | Success badge background |
| `--warning-600` | `#B45309` | Pending / Low stock |
| `--warning-100` | `#FEF3C7` | Warning badge background |
| `--danger-600` | `#B91C1C` | Errors, Delete actions, Void |
| `--danger-100` | `#FEE2E2` | Danger badge background |
| `--info-600` | `#1D4ED8` | Informational badges |
| `--info-100` | `#DBEAFE` | Info badge background |
| `--offline-600` | `#92400E` | Employee POS offline indicator |
| `--sync-600` | `#0F6E7D` | Employee POS syncing indicator |

### 1.4 Rules

- Sidebar is **always** `--brand-950`, never white, never a neutral. This is the single biggest visual signature that makes it read as TouchBistro/Toast rather than generic SaaS.
- Admin panel main canvas background is `--neutral-50`. Cards/tables sit on `--neutral-0` (white) so they visibly lift off the canvas.
- Never use pure black (`#000`) for text. Floor is `--neutral-950`.
- Status is communicated with color **and** an icon/label — never color alone.

---

## 2. Typography

**Font family:** `Inter` (UI) as the base. Load via `next/font`. Do not substitute system-ui defaults — Inter's tabular numerals matter for prices/quantities.

```css
--font-sans: 'Inter', -apple-system, sans-serif;
--font-tabular: 'Inter', sans-serif; /* font-variant-numeric: tabular-nums for all prices, totals, quantities, times */
```

### 2.1 Type Scale — Desktop (Admin Panel, ≥1280px)

| Token | Size | Line height | Weight | Usage |
|---|---|---|---|---|
| `text-display` | 32px / 2rem | 40px | 700 | Page titles ("Staff Members", "Menu Management") |
| `text-h1` | 28px | 36px | 700 | Section headers inside a page |
| `text-h2` | 22px | 30px | 600 | Card titles, dialog titles |
| `text-h3` | 18px | 26px | 600 | Sub-section headers, form group headers |
| `text-body-lg` | 16px | 24px | 400 | Default body text, table cells, input text |
| `text-body` | 15px | 22px | 400 | Secondary body text, labels |
| `text-body-sm` | 13px | 18px | 400 | Helper text, meta text, timestamps |
| `text-caption` | 12px | 16px | 500 | Badge text, table column headers (uppercase) |
| `text-stat` | 36px | 40px | 700 | Dashboard KPI numbers |

**Floor rule: nothing in the Admin Panel or Employee POS renders smaller than 13px, ever.** If a design calls for smaller, redesign the layout instead — do not shrink text to fit.

### 2.2 Type Scale — Tablet (Employee POS, 768–1024px)

| Token | Size | Line height | Weight |
|---|---|---|---|
| `text-display` | 28px | 36px | 700 |
| `text-h1` | 24px | 32px | 700 |
| `text-h2` | 20px | 28px | 600 |
| `text-body-lg` | 17px | 26px | 400 |
| `text-body` | 16px | 24px | 400 |
| `text-caption` | 13px | 18px | 600 |
| `text-price` | 20px | 26px | 700 | Product card price, cart line price |
| `text-total` | 28px | 34px | 700 | Cart grand total |

Tablet floor is **16px body text minimum** — this is higher than desktop because of arm's-length viewing distance and touch context.

### 2.3 Type Scale — Mobile (Customer site, <768px)

| Token | Size | Line height | Weight |
|---|---|---|---|
| `text-display` | 24px | 32px | 700 |
| `text-h1` | 20px | 28px | 700 |
| `text-body` | 15px | 22px | 400 |
| `text-caption` | 12px | 16px | 500 |

### 2.4 Table typography specifically

- Column headers: `text-caption`, uppercase, `letter-spacing: 0.04em`, weight 600, color `--neutral-500`, on `--neutral-100` background.
- Row primary cell (name/title): `text-body-lg`, weight 500, color `--neutral-950`, often the brand link color if clickable.
- Row secondary cell (numbers, dates, status): `text-body-lg`, weight 400, color `--neutral-600`.
- **Row cell text is never smaller than 15px.** This is the #1 thing making the current admin panel look wrong — tables must feel readable from an arm's length away, like TouchBistro's Staff Members table.

---

## 3. The 8px Spacing System

All spacing is a multiple of 8px. The only exception is 4px, used exclusively for micro adjustments (icon-to-label gap, badge internal padding).

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon-to-text gap, badge padding-y |
| `space-2` | 8px | Tight internal gaps (input icon padding) |
| `space-3` | 12px | Badge padding-x, small button padding-y |
| `space-4` | 16px | **Default gap unit.** Form field gaps, card internal padding (mobile) |
| `space-5` | 20px | Table cell vertical padding |
| `space-6` | 24px | **Card padding (default).** Section internal gaps |
| `space-8` | 32px | Card padding (dashboard KPI cards), gap between form groups |
| `space-10` | 40px | Gap between major page sections |
| `space-12` | 48px | Page horizontal padding (desktop content area) |
| `space-16` | 64px | Top-level page vertical rhythm (between page header and content) |

### 3.1 Applied spacing rules

- **Page container padding:** 32px top/bottom, 32px left/right on desktop (`space-8`/`space-8`... actually use `px-8 py-8`), 24px on tablet, 16px on mobile.
- **Card padding:** 24px (`space-6`) on all sides, always. KPI/stat cards use 32px (`space-8`) because they hold less content and need to feel substantial like TouchBistro's stat cards.
- **Gap between cards in a grid:** 24px (`space-6`).
- **Form field vertical gap:** 20px (`space-5`) between fields, 8px (`space-2`) between label and input.
- **Table row height:** minimum 56px (desktop admin), 64px (tablet POS). Cell horizontal padding: 20px (`space-5`). Cell vertical padding: 16px (`space-4`).
- **Sidebar item height:** 48px minimum, with 16px horizontal padding and 12px vertical padding, 8px gap between icon and label.
- **Button padding:** default button = 12px vertical / 20px horizontal (`space-3`/`space-5`). Large/POS button = 16px vertical / 24px horizontal (`space-4`/`space-6`).
- **Section-to-section gap on a page:** 32px (`space-8`).
- **Never let two elements touch with 0 or 2/6/10/14px gaps.** If it's not on the scale above, it's wrong.

---

## 4. Elevation, Radius, Borders

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Badges, small buttons, inputs |
| `radius-md` | 8px | Cards, dialogs, dropdowns (**default**) |
| `radius-lg` | 12px | POS product cards, large touch surfaces |
| `radius-full` | 9999px | Avatar, status dot, pill badges |
| `border-default` | 1px solid `--neutral-200` | Card borders, table borders |
| `border-strong` | 1px solid `--neutral-300` | Input borders |
| `shadow-card` | `0 1px 2px rgba(13,17,23,0.04), 0 1px 3px rgba(13,17,23,0.06)` | Cards resting on `--neutral-50` |
| `shadow-dropdown` | `0 4px 12px rgba(13,17,23,0.10)` | Dropdowns, popovers, dialogs |

No card ever uses more than `shadow-card`. Reserve `shadow-dropdown` for floating/overlay elements only. This restraint is part of why TouchBistro reads as "enterprise software" rather than "AI generated" — flat, confident surfaces, not floaty glassmorphic cards.

---

## 5. Touch Targets & Interaction Sizing

| Context | Minimum size |
|---|---|
| Employee POS (tablet) — any tappable element | **48×48px** (hard floor, per business requirement) |
| Admin Panel — buttons, icon buttons, table row actions | 40×40px |
| Admin Panel — sidebar nav items | 48px height (full width tappable) |
| Checkbox / radio (POS) | 28×28px visual, 48×48px tap zone |
| Checkbox / radio (Admin) | 20×20px visual, 40×40px tap zone |

Icon-only buttons must always have a visible hit-area (padding), never just the icon's bounding box.

---

## 6. Iconography

- **Library:** `lucide-react` only. Never inline SVGs, never other icon packs, never emoji as UI icons.
- Sidebar icons: 20px, `stroke-width: 1.75`.
- Table row action icons: 18px, `stroke-width: 1.75`.
- Dashboard KPI card icons: 24px inside a 48px tinted circular badge (`--brand-100` bg, `--brand-600` icon).
- POS product card icons/badges: 24px minimum.
- Icons are always paired with a text label in navigation and buttons — icon-only is reserved for table row actions and top-bar utility icons (notifications, search).

---

## 7. What "Looks Like TouchBistro" Actually Means (Checklist)

Before shipping any Admin Panel page, verify against the reference screenshot in `docs/design/reference/touchbistro-staff.png`:

- [ ] Sidebar is dark teal (`--brand-950`), not white, not light gray
- [ ] Page title is 32px bold, sitting directly under the top bar with 32px breathing room
- [ ] Filters/dropdowns are labeled above (bold 13px caption), not placeholder-only
- [ ] Primary action button is top-right, solid brand color, not a generic blue
- [ ] Table header is uppercase, gray, bold, with sort indicators — not a solid colored bar (see current problem in Tasty Bites admin — the dark blue solid header reads generic/AI, not enterprise)
- [ ] Table row text is 15–16px, never smaller
- [ ] Row action icons are muted gray, not colored, appear on the right in a consistent column
- [ ] There is no orphaned whitespace — every card/section has a clear purpose
