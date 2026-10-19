---
name: Editorial Clarity
colors:
  surface: '#fff8f2'
  surface-dim: '#e1d9ce'
  surface-bright: '#fff8f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf2e7'
  surface-container: '#f6ede1'
  surface-container-high: '#f0e7db'
  surface-container-highest: '#eae1d6'
  on-surface: '#1f1b14'
  on-surface-variant: '#4b463f'
  inverse-surface: '#343028'
  inverse-on-surface: '#f9efe4'
  outline: '#7c766e'
  outline-variant: '#cdc5bc'
  surface-tint: '#615e5a'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1d1b18'
  on-primary-container: '#87837f'
  inverse-primary: '#cbc5c0'
  secondary: '#785833'
  on-secondary: '#ffffff'
  secondary-container: '#fed2a3'
  on-secondary-container: '#795933'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002116'
  on-tertiary-container: '#698b7c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7e1dc'
  primary-fixed-dim: '#cbc5c0'
  on-primary-fixed: '#1d1b18'
  on-primary-fixed-variant: '#494643'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#e9bf91'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#5e411e'
  tertiary-fixed: '#c6ebd9'
  tertiary-fixed-dim: '#abcebe'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#2d4d40'
  background: '#fff8f2'
  on-background: '#1f1b14'
  surface-variant: '#eae1d6'
typography:
  headline-display:
    fontFamily: Newsreader
    fontSize: 38px
    fontWeight: '400'
    lineHeight: 46px
    letterSpacing: -0.02em
  headline-display-mobile:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-stat:
    fontFamily: Newsreader
    fontSize: 42px
    fontWeight: '300'
    lineHeight: 44px
    letterSpacing: -0.03em
  title-md:
    fontFamily: Newsreader
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12.5px
    fontWeight: '400'
    lineHeight: 17px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-tag:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-3xs: 0.125rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  space-4xl: 3.5rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
  max-width: 1240px
---

## Brand & Style

This design system embodies a serene, thoughtful, and elevated approach to personal productivity and weekly orientation. Built for intentional professionals, researchers, and creators, it transforms task management and agenda tracking from an anxiety-inducing checklist into an editorial ritual reminiscent of fine stationery, archival notebooks, and modern architectural journals.

### Movement & Philosophy
The aesthetic fuses **Warm Editorial Minimalism** with **Contemporary Tactile Precision**:
- **Organic Warmth:** Rejecting sterile cold grays in favor of cream-cast linen tones, warm sand backgrounds, and crisp white surfaces.
- **Literary Sophistication:** High-contrast, expressive serif typography leads major page titles and metric summaries, providing a timeless, deliberate rhythm.
- **Functional Utilitarianism:** Balanced with crisp, human-centered sans-serif interfaces for dates, metadata, categories, and dense micro-lists.
- **Calm Micro-Structure:** Thin, barely-there separation lines, airy inner card paddings, and soft pill badges produce a noise-free hierarchy that respects cognitive bandwidth.

## Colors

The palette is anchored by warm parchment, deep charcoal ink, and subtle botanical and terracotta tints for tagging and category taxonomy.

### Palette Roles & Specific Hex Values

- **Canvas & Surfaces:**
  - `surface-canvas`: `#FBF9F5` (Primary background, warm ivory/creme)
  - `surface-subtle`: `#F3EFE6` (Secondary tinted background, hover states, navigation container)
  - `surface-card`: `#FFFFFF` (Pure white container for elevated agenda & task cards)
  - `surface-border`: `#E9E3D8` (Subtle structural dividers and hair-thin card borders)
  - `surface-border-subtle`: `#F0EAE1` (Row dividers within task lists)

- **Ink & Typography:**
  - `text-primary`: `#1C1A17` (Deepest warm soot ink for headers, card titles, large numerals)
  - `text-secondary`: `#6E685F` (Muted umber gray for dates, secondary labels, metadata)
  - `text-tertiary`: `#9E968B` (Faint captions, inactive chevrons, timestamps)

- **Accents & Categorization Tints:**
  - `accent-brand`: `#8C6A43` (Rich leather/brass tone for active states and week indicators)
  - `category-work`: Background `#EBF1F6`, Text/Border `#36587A` (Soft steel blue)
  - `category-study`: Background `#F4EFE6`, Text/Border `#856133` (Oatmeal amber)
  - `category-leisure`: Background `#EBF4EE`, Text/Border `#2E6243` (Sage pine)
  - `category-health`: Background `#F8EBEA`, Text/Border `#9B453B` (Terracotta blush)
  - `status-alert`: Background `#FCF0EE`, Text/Icon `#C1382A` (Late/overdue micro-badges)

## Typography

Typography establishes the literary atmosphere of the interface:

- **Serif Role (Newsreader):** Used for primary page titles (`headline-display`), section headers (`title-md`), and high-impact stat figures (`headline-stat`). It conveys human touch, discipline, and reflective clarity.
- **Sans-Serif Role (Plus Jakarta Sans):** Applied to all functional micro-data, event descriptions, metric labels, category tags, and interactive filters. Its round geometric counters pair naturally with the organic curves of the serif.
- **Label Capitalization:** Metric labels (e.g., "COMPROMISSOS", "ATRASADAS") utilize `label-caps` in uppercase with subtle positive letter spacing (`0.06em`) to ensure legibility at micro scales without feeling heavy.

## Layout & Spacing

The layout is disciplined, predictable, and prioritizes vertical breathing space over packed density.

### Breakpoints & Adaptive Grid
- **Desktop (1024px+):** 
  - Max container width of `1240px` with central alignment and `space-3xl` top margin.
  - KPI Stat Bar: 4-column equal-width grid gap of `space-md`.
  - Main Body: 2-column split (7:5 ratio or equal 6:6) separating "Agenda/Compromissos" and "Tarefas/Ações" with `space-xl` column gap.
- **Tablet (768px - 1023px):**
  - KPI Stat Bar collapses to 2x2 grid.
  - Main Body adjusts to side-by-side or stacked vertical panels depending on content length.
- **Mobile (< 768px):**
  - KPI Stat Bar transitions to a horizontally scrollable snap-carousel or 2-column compact grid.
  - Primary view segments use a sticky top segmented pill bar ("Compromissos" | "Tarefas") or a continuous stacked single-column flow with `space-md` gutters.
  - Edge margin is locked to `gutter-mobile` (16px) with zero card overflow clipping.

## Elevation & Depth

Visual depth is conveyed through tactile surface shifts and ultra-diffused atmospheric drop shadows rather than stacked blurs or saturated overlays.

- **Level 0 (Canvas Base):** Unadorned `#FBF9F5` warm sand tone.
- **Level 1 (Cards & Modules):** Pure `#FFFFFF` fill resting on the canvas, bounded by a crisp 1px border of `#E9E3D8` and an ambient shadow: `box-shadow: 0 2px 10px -2px rgba(45, 38, 27, 0.04), 0 1px 3px 0 rgba(45, 38, 27, 0.02)`.
- **Level 2 (Hover / Active State):** Subtle elevation increase on hover: `box-shadow: 0 8px 24px -4px rgba(45, 38, 27, 0.07), 0 2px 6px -1px rgba(45, 38, 27, 0.03)`, translateY(-1px).
- **Dividers & Separators:** List items are delineated strictly with a 1px solid stroke in `#F0EAE1`, terminating 4px before card boundaries to preserve internal air.

## Shapes

The geometric identity relies on soft, architectural rounded corners that balance soft paper notes with precision digital tools:

- **Containers & Big Cards:** `1rem` (16px) corner radius, delivering an inviting, approachable notebook feel.
- **Metric Tiles:** `0.875rem` (14px) corner radius.
- **Chips, Category Tags & Status Badges:** Fully pill-shaped (`9999px`) to create organic contrast against rectilinear card blocks.
- **Selection Controls (Checkboxes):** `0.375rem` (6px) roundedness for modern, tactile tick boxes.
- **Interactive Buttons:** `0.625rem` (10px) to `9999px` for navigation controls and dates.

## Components

### 1. Header & Date Navigator
- **Page Context Label:** Upper eyebrow in `label-caps` (`#8C6A43`) positioned above the serif main header.
- **Title Block:** `headline-display` in `#1C1A17`.
- **Date Switcher:** Minimalist inline component featuring left/right muted chevrons (`#6E685F`) flanking a middle date range in `body-sm` (Newsreader or Plus Jakarta Sans Medium). Borderless, clean, with a 24px circular hover highlight (`#F3EFE6`).

### 2. Metric / KPI Cards
- **Structure:** White card (`#FFFFFF`) with 16px internal padding, 1px `#E9E3D8` border.
- **Top Row:** Flex container holding `label-caps` in `#6E685F` and a clean 16px outline icon (`#9E968B`, switching to `#C1382A` for alert states).
- **Metric Digit:** Massive, graceful numeral rendered in `headline-stat` (`#1C1A17`), left-aligned with a subtle baseline padding.

### 3. Agenda & Commitment List Item
- **Layout:** Vertical stack with `space-sm` vertical spacing between rows.
- **Item Header:** Flex row containing the event title in `body-lg` (`#1C1A17`) paired with a pill badge indicator.
- **Origin Badge:** Micro-pill (`18px` height, 8px horizontal padding, `10px` font) in `#EBF1F6` with `#36587A` text indicating calendar source (e.g., "Google").
- **Timestamp & Subtitle:** `body-sm` in `#6E685F` displaying weekday abbreviation, calendar date, and duration range.
- **Separator:** 1px horizontal rule in `#F0EAE1`.

### 4. Task Cards & Interactive Checklist
- **Checkbox Element:** 18x18px square with 5px radius, 1.5px border in `#D4CCC0`. On hover, fills with `#F3EFE6`. Checked state fills `#1C1A17` with a crisp white checkmark SVG.
- **Task Title:** `body-lg` in `#1C1A17`. Completed state exhibits `#9E968B` text and a subtle line-through transition.
- **Due Date Pill:** Subtle oatmeal or sand pill (`#F4EFE6`) indicating due window (e.g., "Semana", "Amanhã") in `label-tag`.

### 5. Category Tags & Micro Badges
- Built with a height of `22px`, horizontal padding of `10px`, and font size of `11px` (medium weight).
- Subtle tints only; avoid high-saturation fills to maintain the warm paper editorial atmosphere.