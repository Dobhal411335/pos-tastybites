# 02 — Component Standards (shadcn/ui is Mandatory)

> Every visual element in this project MUST be a shadcn/ui component, styled with
> the tokens from `01-design-system.md`. Raw HTML elements (`<button>`, `<input>`,
> `<select>`, `<table>`, generic `<div>` cards) are **forbidden** in page code.
> This document maps every situation to its required component.

## 0. The Rule

If a shadcn component exists for the job, **use it**. Do not hand-roll a version
that "looks similar." Import from `@/components/ui/*`. If shadcn doesn't have a
primitive for something (e.g. a KPI stat card), build it by **composing** existing
shadcn primitives (`Card` + `CardHeader` + `CardContent`), never from a raw `<div>`
with manual Tailwind classes replicating what `Card` already does.

Run `npx shadcn@latest add <component>` for every component below before using it —
do not copy-paste component code manually.

---

## 1. Forbidden → Required Mapping

| Never write | Always use |
|---|---|
| `<button>` | `<Button />` |
| `<input>` | `<Input />` (wrapped in `<FormField>` when inside a form) |
| `<select>` | `<Select><SelectTrigger><SelectContent><SelectItem>` |
| `<table>` | `<Table><TableHeader><TableBody><TableRow><TableCell>` |
| `<textarea>` | `<Textarea />` |
| Custom `<div>` modal/overlay | `<Dialog>` / `<Sheet>` (side panel) / `<Drawer>` (mobile/tablet) |
| Custom colored `<span>` pill | `<Badge variant="..." />` |
| Custom `<div>` card with border+shadow classes | `<Card><CardHeader><CardTitle><CardContent>` |
| Custom checkbox (`<div>` + onClick) | `<Checkbox />` |
| Custom toggle | `<Switch />` |
| `<a>`/`<div>` dropdown menu | `<DropdownMenu>` |
| Manual pagination buttons | Custom `Pagination` built from shadcn `Button` + `Select` (see §7) |
| `window.alert` / custom toast div | `<Toast>` via `useToast()` / `sonner` |
| Manual tab buttons | `<Tabs><TabsList><TabsTrigger><TabsContent>` |
| Custom loading spinner div | `<Skeleton />` for content loading states |
| Native `<form>` handling | `react-hook-form` + `<Form>` + `zodResolver` |

---

## 2. Button

**Component:** `<Button />`

| Variant | Usage |
|---|---|
| `default` (solid `--brand-600`) | Primary page action (top-right "Add", "Create") |
| `secondary` | Secondary actions ("Cancel", "Export") |
| `destructive` | Delete, Void, Remove |
| `outline` | Tertiary actions inside cards/toolbars |
| `ghost` | Table row icon actions, top-bar icons |
| `link` | Inline text actions only |

| Size | Height | Usage |
|---|---|---|
| `sm` | 32px | Dense toolbar contexts only |
| `default` | 40px | **Standard everywhere in Admin Panel** |
| `lg` | 48px+ | **Mandatory in Employee POS** — all POS buttons use this or a custom `pos` size below |
| `pos` (custom, add to button variants) | 56px min-height, `text-body-lg` bold | POS order actions ("Add to Order", "Charge", category tabs) |

Rules:
- Every button has a label. Icon-only buttons must add `aria-label` and are reserved for row actions/top bar.
- Loading state: disable button + show `<Loader2 className="animate-spin" />` from lucide-react + keep label ("Saving...").
- Never use a raw colored `<div>` styled to look like a button "for layout reasons."

---

## 3. Input & Form

**Components:** `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`, `<Input>`, wired through `react-hook-form` + `zod`.

**Mandatory pattern for every form field:**

```
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label Text</FormLabel>
      <FormControl>
        <Input placeholder="..." className="h-11 text-base" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

- Input height: `h-11` (44px) minimum in Admin, `h-12`/48px in POS contexts.
- Labels: always visible, always above the field (never placeholder-only, never floating label). Bold, `text-body-sm`, `--neutral-800`.
- Validation: `zod` schema per form, resolver via `zodResolver`. Error text renders through `<FormMessage />` in `--danger-600`.
- Group related fields inside a `<Card>` with a `<CardHeader><CardTitle>` describing the group (e.g. "Basic Information", "Pricing", "Availability") — never a flat unbroken list of 15 fields.
- Required fields marked with a red asterisk in the label, not just validation-on-submit.

---

## 4. Select / Dropdown filters

**Component:** `<Select>`

```
<div className="space-y-2">
  <label className="text-sm font-semibold text-neutral-800">Select a location</label>
  <Select>
    <SelectTrigger className="h-11 w-[220px]"><SelectValue /></SelectTrigger>
    <SelectContent>...</SelectContent>
  </Select>
</div>
```

This exact pattern (label above, 44px trigger, fixed reasonable width) is what makes TouchBistro's "Select a location / Filter By" toolbar read as professional. Never use a bare `<Select>` with no visible label floating in a toolbar.

---

## 5. Table

**Components:** `<Card>` wrapping `<Table>`, always with `<TableHeader>` sticky.

**Mandatory structure for every data table page:**

```
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle>...</CardTitle>
    <div className="flex items-center gap-3">
      <Input placeholder="Search..." className="w-64" />  {/* search */}
      <Select>...</Select>                                 {/* filter */}
      <Button variant="outline">Bulk Actions</Button>       {/* if applicable */}
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      <TableHeader className="sticky top-0 bg-neutral-100 z-10">
        <TableRow>
          <TableHead><Checkbox /></TableHead>
          <TableHead>COLUMN <ArrowUpDown className="inline w-3 h-3" /></TableHead>
          ...
          <TableHead className="text-right">ACTIONS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="h-14 hover:bg-neutral-50">
          <TableCell><Checkbox /></TableCell>
          <TableCell className="text-base font-medium">{value}</TableCell>
          ...
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-danger-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </CardContent>
  <CardFooter className="justify-between border-t py-4">
    <span className="text-sm text-neutral-500">Showing 1-10 of 48</span>
    <Pagination />
  </CardFooter>
</Card>
```

Requirements every table MUST have:
- [ ] Search input (client or server-side)
- [ ] At least one filter `<Select>` if the data supports categorization
- [ ] Sortable column headers with `ArrowUpDown`/`ArrowUp`/`ArrowDown` icon (lucide)
- [ ] Sticky header on scroll
- [ ] Row height ≥56px, cell text ≥15px (never the tiny text seen in the current build)
- [ ] Actions in a `<DropdownMenu>` behind a `MoreHorizontal` icon — not 4 loose icon buttons crammed in a cell, unless there are only 2 actions (then two `ghost` icon buttons is acceptable)
- [ ] Empty state (see §9) instead of a blank white table when there's no data
- [ ] Pagination in the footer, never infinite unstyled lists

**Never use a solid dark blue/colored full-bleed header bar** (as in the current Tasty Bites "Create Menu Category" table) — that reads as generic AI/Bootstrap styling. Headers are always `--neutral-100` background with `--neutral-500` uppercase text, matching TouchBistro.

---

## 6. Card (KPI / Dashboard stat cards)

```
<Card className="p-8">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-body-sm text-neutral-500 font-medium">Today's Sales</p>
      <p className="text-stat text-neutral-950 tabular-nums mt-2">$4,286.50</p>
      <p className="text-body-sm text-success-600 mt-1">↑ 12% vs yesterday</p>
    </div>
    <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
      <DollarSign className="w-6 h-6 text-brand-600" />
    </div>
  </div>
</Card>
```

Dashboard KPI grid: 4 columns desktop (`grid-cols-4 gap-6`), 2 columns tablet, 1 mobile. No KPI card is ever left with dead empty space below the number — if there's nothing else to show, the trend line (↑/↓ vs previous period) is mandatory content, not decoration.

---

## 7. Pagination

Build from shadcn primitives — there is no default shadcn `Pagination` with page-size control, so compose:

```
<div className="flex items-center gap-4">
  <Select> {/* rows per page: 10/25/50/100 */} </Select>
  <div className="flex items-center gap-1">
    <Button variant="outline" size="icon"><ChevronLeft /></Button>
    <span className="text-sm px-2">Page 2 of 5</span>
    <Button variant="outline" size="icon"><ChevronRight /></Button>
  </div>
</div>
```

---

## 8. Dialog / Drawer / Sheet

- **Dialog:** confirmations, single-field quick edits, "Add [short entity]" (e.g. Add Category).
- **Sheet (side panel):** longer forms (Add/Edit Product, Add Employee) — keeps table context visible on the left, matches Toast/Square's edit-panel pattern.
- **Drawer:** Employee POS only (bottom sheet for order details, item modifiers on tablet).
- **AlertDialog:** destructive confirmations ("Delete this employee? This cannot be undone.") — always required before any destructive action, never a raw `confirm()`.

---

## 9. Badge (status)

```
<Badge className="bg-success-100 text-success-600 border-none">
  <span className="w-1.5 h-1.5 rounded-full bg-success-600 mr-1.5" /> Active
</Badge>
```

Standard statuses and their variant colors:

| Status | Colors |
|---|---|
| Active / Paid / Synced / Verified | success |
| Pending / Awaiting / Low Stock | warning |
| Inactive / Void / Failed | danger |
| Draft / Info | info |
| Offline (POS only) | offline (amber-brown, see 01) |

---

## 10. Empty States

Never a blank white card. Every empty table/list uses:

```
<div className="flex flex-col items-center justify-center py-16 text-center">
  <IconComponent className="w-10 h-10 text-neutral-300 mb-4" />
  <p className="text-h3 text-neutral-800">No employees yet</p>
  <p className="text-body-sm text-neutral-500 mt-1 mb-6">Add your first team member to get started.</p>
  <Button><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
</div>
```

---

## 11. AI Pre-Ship Validation (run this checklist before finishing ANY page)

- [ ] No raw `<button>`, `<input>`, `<select>`, `<table>`, or unstyled `<div>` acting as a card
- [ ] Every button uses `<Button variant="..." size="...">`
- [ ] Every icon is from `lucide-react`
- [ ] Every color used is a token from `01-design-system.md` (search the diff for raw hex — if found, fix it)
- [ ] Every spacing value is on the 8px scale
- [ ] Table has search + filter + sort + pagination + sticky header
- [ ] Form uses `react-hook-form` + `zod`, fields grouped in labeled `Card`s
- [ ] Empty state exists if the list/table can be empty
- [ ] Loading state exists (`<Skeleton>`) for any async data
- [ ] Destructive actions go through `<AlertDialog>`

**If any answer is NO, do not consider the page done — fix it before moving on.**
