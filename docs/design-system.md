# Restaurant Management System - Design System

Version: 1.0

This document defines the complete UI Design System for the project.

Every page, component and feature MUST follow these rules.

Never create a new design language.

Never invent new colors.

Never create duplicate components.

Always reuse the existing design system.

---

# Design Philosophy

The application is a premium Restaurant Management Software made for restaurants in Canada.

The UI should feel like:

- Toast POS
- Square Dashboard
- Lightspeed Restaurant
- Clover POS
- Shopify Admin

The interface should be:

- Clean
- Modern
- Professional
- Minimal
- Fast
- Spacious
- Enterprise
- Restaurant-focused

Avoid flashy UI.

Avoid AI-generated looking interfaces.

Avoid startup landing page aesthetics.

The software should look like a real business application used every day.

---

# Theme

Use Light Theme only.

Never generate dark mode unless specifically requested.

Background must always be soft.

Cards should always be white.

---

# Colors

## Background

#FAFAFA

## Surface

#FFFFFF

## Card

#FFFFFF

## Border

#E5E7EB

## Divider

#F1F5F9

---

## Text

Primary

#18181B

Secondary

#52525B

Muted

#71717A

Placeholder

#A1A1AA

---

## Primary Brand

#F97316

Hover

#EA580C

Light

#FFF7ED

---

## Success

#16A34A

Background

#F0FDF4

---

## Warning

#D97706

Background

#FFFBEB

---

## Danger

#DC2626

Background

#FEF2F2

---

## Info

#0284C7

Background

#F0F9FF

---

# Border Radius

Buttons

10px

Cards

14px

Dialog

16px

Inputs

10px

Tables

12px

Dropdown

12px

---

# Shadows

Use only subtle shadows.

Never use heavy shadows.

Card

shadow-sm

Dialog

shadow-xl

Dropdown

shadow-lg

Never use glowing shadows.

---

# Typography

Use

Inter

Only.

Never use multiple fonts.

---

## Heading

text-3xl

font-semibold

tracking-tight

---

## Section Heading

text-xl

font-semibold

---

## Card Title

text-lg

font-medium

---

## Body

text-sm

---

## Caption

text-xs

---

# Layout

Every page follows

Navbar

↓

Page Header

↓

Actions

↓

Content

Use generous whitespace.

Avoid cramped layouts.

---

# Page Width

Always

max-w-7xl

Center content when appropriate.

Admin tables should use full width.

---

# Cards

Cards must

White

Rounded

Soft Border

Small Shadow

24px Padding

No gradients.

No colored cards unless displaying status.

---

# Sidebar

Sidebar is always

White

Right Border

Sticky

Scrollable

Minimal

Use one accent color only.

Active item

Orange background

Orange text

Rounded

Hover

Light Gray

Never use black sidebar.

Never use gradients.

---

# Navbar

Height

64px

White

Bottom Border

Sticky

Contains

Breadcrumb

Search

Notifications

Profile

---

# Buttons

Use only shadcn Button.

Variants

Default

Outline

Secondary

Ghost

Destructive

Never create custom button styles.

---

# Inputs

Height

44px

Rounded

Border

Gray

Focus

Orange Ring

Spacing

24px

Use React Hook Form.

---

# Forms

Every form should have

Page Title

Description

Section Divider

Grouped Inputs

Validation

Submit Button

Cancel Button

Never place more than 2 fields per row on desktop.

One column on mobile.

---

# Tables

Always use

Sticky Header

Hover Row

Pagination

Search

Filters

Empty State

Loading Skeleton

Responsive

20 Rows Per Page

Actions Dropdown

Never place more than 6 actions inline.

---

# Search

Debounce

300ms

Always preserve URL filters.

Example

/menu?q=burger&page=2

---

# Pagination

20 rows per page.

Preserve

Search

Filters

Sorting

Page

---

# Dialog

Rounded

Large Padding

Proper Title

Proper Description

Cancel

Primary Action

Never fullscreen on desktop.

---

# Drawer

Use on

Mobile

Filters

Cart

Quick Edit

---

# Icons

Use only

Lucide React

Never use

Heroicons

FontAwesome

Material Icons

Bootstrap Icons

---

# Images

Use

Next/Image

Cloudinary

Rounded

Lazy Loading

Object Cover

---

# Empty State

Every page must have

Illustration

Title

Description

Primary Action

---

# Loading

Use Skeletons.

Avoid spinners whenever possible.

---

# Badges

Rounded

Small

Status colors only

Active

Orange

Success

Green

Draft

Gray

Deleted

Red

---

# Animations

Very subtle.

150ms–200ms

Use

opacity

translateY

scale

Avoid

Bounce

Rotate

Large Animations

---

# Responsive

Desktop

Tablet

Mobile

Must work perfectly.

---

# Component Rules

Always reuse existing components.

Never duplicate components.

If a component exists,

reuse it.

Do not recreate it.

---

# Available Components

Button

Input

Textarea

Select

Checkbox

Switch

Badge

Avatar

Dialog

Drawer

Dropdown Menu

Data Table

Search Bar

Filter Bar

Pagination

Breadcrumb

Page Header

Empty State

Skeleton

Loading

Status Badge

Delete Dialog

Image Upload

---
# UI Component Rules

## IMPORTANT

This project MUST use only components provided by the official shadcn/ui library.

Never recreate components that already exist in shadcn/ui.

Always import and use the existing component.

Examples

✅ Button

✅ Input

✅ Textarea

✅ Select

✅ Checkbox

✅ Switch

✅ Radio Group

✅ Label

✅ Badge

✅ Avatar

✅ Card

✅ Separator

✅ Dialog

✅ Alert Dialog

✅ Drawer

✅ Sheet

✅ Dropdown Menu

✅ Navigation Menu

✅ Menubar

✅ Popover

✅ Hover Card

✅ Tooltip

✅ Calendar

✅ Date Picker

✅ Table

✅ Pagination

✅ Scroll Area

✅ Skeleton

✅ Accordion

✅ Collapsible

✅ Tabs

✅ Breadcrumb

✅ Command

✅ Context Menu

✅ Toast

✅ Sonner

Use these components exactly as provided by shadcn/ui.

Customization is allowed only through Tailwind utility classes.

Never rewrite the component logic.

Never duplicate the component.

Never build your own Input, Select, Dialog, Table, Dropdown or Button if an official shadcn/ui component already exists.

---

# Forms

Every form MUST use

React Hook Form

+

shadcn/ui form components

Required components

Form

FormField

FormItem

FormLabel

FormControl

FormDescription

FormMessage

Input

Textarea

Select

Checkbox

Switch

Radio Group

Date Picker

Button

Never use native HTML form controls unless no shadcn component exists.

Bad ❌

<input />

<select />

<textarea />

Good ✅

<Input />

<Select />

<Textarea />

---

# Tables

Always use the official shadcn/ui Table component.

Never create a custom table layout.

Every table should support

- Search
- Filter
- Pagination
- Empty State
- Loading Skeleton
- Actions Dropdown

---

# Dialogs

Always use

Dialog

AlertDialog

Drawer

Sheet

from shadcn/ui.

Never create custom modal implementations.

---

# Icons

Use ONLY Lucide React.

Never use

Heroicons

FontAwesome

Material Icons

Bootstrap Icons

React Icons

Only Lucide React.

---

# AI Instruction

Before creating any UI,

first check whether shadcn/ui already provides that component.

If it exists,

always use the official shadcn/ui component.

Never build a duplicate component.

Prefer composition over recreation.

The project should feel like a premium enterprise application while relying on the official shadcn/ui design system.

# UI Rules

Never use gradients.

Never use glassmorphism.

Never use neumorphism.

Never use oversized typography.

Never use neon colors.

Never create AI-looking interfaces.

Never create marketing landing page sections inside admin.

Always prioritize readability.

Always prioritize usability.

Consistency is more important than creativity.

---
## Component Priority

Before creating any new UI component, follow this order:

1. Check if the component exists in shadcn/ui.
2. If it exists, use it.
3. If additional behavior is needed, wrap the shadcn/ui component.
4. Only create a completely new component if no equivalent exists in shadcn/ui.

Never replace official shadcn/ui components with custom implementations.

# AI Instructions

Before generating any page

Follow this document strictly.

Do not invent new colors.

Do not invent new spacing.

Do not invent new shadows.

Do not invent new components.

Reuse existing components.

Follow the project architecture.

If uncertain,

ask before generating.