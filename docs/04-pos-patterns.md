# 04 — Employee POS Patterns (Tablet, Offline-First PWA)

> Employee POS is a distinct app from Admin. It is tablet-first, touch-only,
> optimized for speed under pressure during a dinner rush. Every rule here
> overrides the general Admin sizing in `01-design-system.md` where they conflict —
> POS is always the larger, more forgiving, more forgiving-of-fat-fingers version.

## 0. Core Principles

1. **Speed over density.** A busy server tapping through an order in under 20 seconds matters more than fitting more on screen.
2. **48×48px minimum touch target everywhere, no exceptions.** This is a hard business requirement, not a guideline.
3. **Never require precision taps.** Buttons have generous padding; nothing depends on hitting a 2px-tall link.
4. **Offline is a first-class state, not an error state.** The UI must always tell the employee clearly whether they're online, offline, or syncing — passively, without blocking work.
5. **One thumb, one hand.** Primary actions (Add to Order, Charge, Send to Kitchen) sit within easy reach in the bottom-right or a fixed action bar — never top-of-screen only.

---

## 1. App Shell — Order Screen

```
┌───────────────────────────────────────────────┬─────────────────┐
│ [☰] Tasty Bites    [🟢 Online] [Table 4]  [👤] │  ORDER — Table 4 │
├─────────────────────────────────────────────────┤─────────────────┤
│ [Starters] [Burgers] [Pizza] [Desserts] [Drinks] │  Item x1   $12  │  ← cart panel
│  ← category tabs, horizontally scrollable, 56px │  Item x2   $24  │     fixed width
├───────────────────────────────────────────────┤  ─────────────  │     360px
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │  Subtotal  $36  │
│  │Product │ │Product │ │Product │ │Product │   │  Tax       $3.2 │
│  │ card   │ │ card   │ │ card   │ │ card   │   │  ─────────────  │
│  └────────┘ └────────┘ └────────┘ └────────┘   │  Total    $39.2 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │                 │
│  │        │ │        │ │        │ │        │   │  [Send to       │
│  └────────┘ └────────┘ └────────┘ └────────┘   │   Kitchen] (56h)│
│                                                   │  [Charge] (56h) │
└───────────────────────────────────────────────┴─────────────────┘
```

- **Product grid area:** left/main, scrollable, 4 columns on a standard 10–11" landscape tablet, 3 columns portrait.
- **Cart/order panel:** fixed 360px right rail, always visible (never a hidden drawer during active ordering — servers need to see the running total constantly).
- **Category tabs:** horizontally scrollable pill/tab row, 56px height, active tab filled `--brand-600`, sticky under the top bar.
- **Action bar (bottom of cart panel):** stacked full-width buttons, `pos` size (56px+), "Send to Kitchen" as `secondary`/`outline`, "Charge" as `default` filled brand color — largest, most prominent element on screen.

---

## 2. Product Card

```
┌──────────────┐
│              │
│  [photo]     │  ← 4:3 image, radius-lg top corners
│              │
│──────────────│
│ Cheeseburger │  ← text-body-lg bold, 1 line truncate
│ $12.00       │  ← text-price, brand or neutral-950
└──────────────┘
```

- Minimum card size: 140×160px, `radius-lg` (12px), `shadow-card`.
- Entire card is the tap target (not just a small "add" button) — tapping opens a modifier sheet if the item has options, or adds directly to cart with a brief scale/flash animation if it has none.
- Out-of-stock items: card at 50% opacity, "86'd" badge overlay, tap disabled.
- No text below 16px anywhere on this card.

---

## 3. Modifier Sheet (item options)

Opens as a `Drawer` (bottom sheet) sliding up from the bottom — thumb-reachable, doesn't require reaching to the top of a large tablet.

```
┌─────────────────────────────────────────┐
│  Cheeseburger                        [×] │
│ ─────────────────────────────────────── │
│  Choose Doneness (required)              │
│  ( ) Rare  ( ) Medium  (●) Well Done     │  ← radio, 48px tap rows
│                                           │
│  Add-ons                                 │
│  [ ] Bacon +$2.00                        │
│  [ ] Extra Cheese +$1.50                 │
│                                           │
│  [ − ]   2   [ + ]     Qty controls, 48px│
│                                           │
│  [        Add to Order — $24.00      ]   │  ← 56px, full width
└─────────────────────────────────────────┘
```

- Every option row is a full 48px tall tap target, not just the radio/checkbox itself.
- Quantity stepper: `−`/`+` buttons are 48×48px squares flanking the number, never a small numeric input requiring the keyboard.
- CTA button shows the live calculated total, updates instantly as modifiers are toggled.

---

## 4. Offline & Sync Indicator

Persistent, always visible in the top bar — never buried in a menu.

| State | Visual |
|---|---|
| **Online** | Small solid dot, `--success-600`, label "Online" |
| **Offline** | Solid dot `--offline-600` (amber-brown), label "Offline — orders saving locally", top bar gets a thin 3px amber top border as ambient reinforcement |
| **Syncing** | Dot pulses/spins `--sync-600` (brand teal), label "Syncing 3 orders..." |
| **Sync error** | Dot `--danger-600`, label "2 orders failed to sync", tappable → opens sync queue detail |

- Tapping the indicator opens a small popover showing the sync queue: pending orders, timestamps, retry action.
- Never block order-taking while offline or while syncing — this indicator is informational, always non-modal.
- On reconnect, show a brief non-blocking toast: "Back online — syncing 4 orders" → "All orders synced" (auto-dismiss).

---

## 5. Bootstrap / Offline Data Loading

On login, before the POS becomes interactive:

```
┌─────────────────────────────┐
│      [Logo]                  │
│  Loading menu & settings...  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  68%      │
└─────────────────────────────┘
```

- Full-screen loading state while the bootstrap API populates IndexedDB (menu, products, categories, tables, discounts, tax, settings). Show a determinate progress bar if possible, not an indeterminate spinner — employees are often doing this at the start of a rush and need to trust it's almost done.
- On subsequent logins with cached data already present, skip straight to the order screen and sync deltas silently in the background.

---

## 6. Restaurant Closure State (new requirement)

If Admin has set Holiday/Maintenance closure with employee ordering disabled:

```
┌─────────────────────────────────┐
│         [Icon: closed sign]      │
│  Ordering is currently disabled  │
│  Reason: Scheduled Maintenance   │
│  Contact your manager for help.  │
└─────────────────────────────────┘
```

Full-screen state replacing the order screen — not a dismissible banner, since taking orders must be actually prevented. Table management / viewing past orders may remain accessible depending on business rule; ordering entry specifically is blocked.

---

## 7. Employee Login (POS)

- Large PIN-pad style login (numeric keypad, 4–6 digit PIN), buttons 64×64px in a 3-column grid — built for speed, not a username/password form.
- Employee avatar/name selection grid above the PIN pad if multiple employees share a device (common in restaurant POS — tap your name, then enter PIN).
- Works fully offline against the last-synced employee/PIN list in IndexedDB.

---

## 8. Order List / Table View

```
┌────────┬────────┬────────┬────────┐
│ Table 1│ Table 2│ Table 3│ Table 4│   ← table cards, color-coded by status
│ Open   │ Empty  │ Ordered│ Paid   │      Open=brand, Empty=neutral,
│ $24.00 │        │ $58.00 │ $39.20 │      Ordered=warning, Paid=success
└────────┴────────┴────────┴────────┘
```

- Table/order cards minimum 120×100px, color left-border or full-tint indicating status at a glance (a server should be able to read the floor status from across the room).
- Tapping a table opens its order screen (§1). Long-press or a small icon opens quick actions (transfer table, merge, print check) without entering full edit mode.

---

## 9. Typography & Sizing Recap for POS (from `01-design-system.md` §2.2/§5)

- Body text floor: **16px**. Category tab labels: 16px bold. Product name: 16px bold. Price: 20px bold, tabular numerals.
- All primary action buttons: 56px height minimum, `text-body-lg` bold label.
- All tap targets, including checkboxes/radios inside modifier sheets: 48×48px minimum — verify this explicitly for every new POS screen before shipping.
