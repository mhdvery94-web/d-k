# Desain Dapur Kemas - Spesifikasi UI/UX

## 🎨 Design Philosophy

Aplikasi Dapur Kemas menggunakan pendekatan **mobile-first** dengan tema profesional putih-biru. Desain terinspirasi dari aplikasi food delivery modern (GoFood, ShopeeFood) namun dengan identitas visual tersendiri.

### Prinsip Desain
- **Clean & Minimal** - Fokus pada konten, tanpa elemen berlebihan
- **Professional** - Warna biru memberikan kesan terpercaya dan profesional
- **User-Friendly** - Navigasi intuitif, tombol besar, spacing yang cukup
- **Responsive** - Optimal di semua ukuran layar
- **Accessible** - Kontras warna yang baik, font size yang readable

---

## 🎨 Design System

### Color Palette

```css
/* Primary Colors */
--dk-blue: #1D4ED8           /* Primary action */
--dk-blue-light: #3B82F6     /* Hover states */
--dk-blue-pale: #EFF6FF      /* Backgrounds */
--dk-blue-dark: #1E40AF      /* Active states */

/* Neutral Colors */
--dk-text: #1E293B           /* Primary text */
--dk-text-muted: #64748B     /* Secondary text */
--dk-text-subtle: #94A3B8    /* Disabled/hint text */
--dk-bg: #FFFFFF             /* Background */
--dk-bg-page: #F8FAFC        /* Page background */
--dk-border: #E2E8F0         /* Borders */

/* Semantic Colors */
--dk-green: #16A34A          /* Success */
--dk-red: #EF4444            /* Error/Delete */
--dk-orange: #F59E0B         /* Warning */
```

### Typography

```css
/* Font Family */
font-family: 'Inter', system-ui, -apple-system, sans-serif

/* Font Sizes */
Heading 1 (Brand):    20px, weight 800, letter-spacing 0.04em
Heading 2 (Section):  17px, weight 700
Body Text:            14px, weight 400
Small Text:           12px, weight 400
Button Text:          13-15px, weight 700

/* Report Font (Print) */
font-family: 'Courier New', Courier, monospace
```

### Spacing System

```css
--dk-radius-sm: 8px     /* Small elements */
--dk-radius: 12px       /* Standard elements */
--dk-radius-lg: 16px    /* Large elements */
--dk-radius-xl: 20px    /* Extra large */

/* Padding */
Standard:    16-20px
Compact:     8-12px
Spacious:    24-32px
```

### Shadows

```css
--dk-shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--dk-shadow: 0 2px 6px rgba(0,0,0,0.06)
--dk-shadow-lg: 0 8px 24px rgba(0,0,0,0.10)
--dk-shadow-xl: 0 20px 48px rgba(0,0,0,0.14)
```

---

## 📱 Layout & Components

### Customer Page Layout

```
┌─────────────────────────────────┐
│  Header (Sticky)                │
│  ┌─────────────────────────┐   │
│  │ [Logo] DAPUR - KEMAS    │   │
│  │        Aplikasi...      │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│                                 │
│  Category Accordion             │
│  ┌─────────────────────────┐   │
│  │ 🍛 Makanan          5   │   │
│  ├─────────────────────────┤   │
│  │ [Img] Menu Item    [+]  │   │
│  │       Description       │   │
│  │       Rp 15.000         │   │
│  ├─────────────────────────┤   │
│  │ [Img] Menu Item    [+]  │   │
│  └─────────────────────────┘   │
│                                 │
│  [More Categories...]           │
│                                 │
├─────────────────────────────────┤
│  Cart Bar (Sticky Bottom)       │
│  ┌─────────────────────────┐   │
│  │ 3 items    Rp 45.000    │   │
│  │              [Bayar]    │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Admin Page Layout

```
┌─────────────────────────────────┐
│  Header (Sticky)                │
│  ┌─────────────────────────┐   │
│  │ [Logo] DAPUR - KEMAS    │   │
│  │        Panel Admin      │   │
│  │     [🔑] [🚪] [🏠]     │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  Navigation Tabs                │
│  ┌──────┬──────┬──────┐        │
│  │Dash  │Menu  │Report│        │
│  └──────┴──────┴──────┘        │
├─────────────────────────────────┤
│                                 │
│  Content Area                   │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │  Stats Cards / Table    │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### Component Specifications

#### 1. Header
- **Height:** Auto (flexible based on content)
- **Position:** Sticky top
- **Background:** White with bottom border
- **Logo:** 56x56px (desktop), 48x48px (mobile)
- **Brand Name:** "DAPUR - KEMAS" uppercase, 20px bold
- **Subtitle:** 14px, muted color

#### 2. Category Accordion
- **Header:** Full-width button with icon, label, count, chevron
- **Animation:** Slide down 250ms ease
- **Chevron:** Rotates 180° when open
- **Background:** Hover state on hover

#### 3. Menu Item Card
- **Layout:** Flex row
- **Image:** 80x80px, rounded corners, object-fit cover
- **Content:** Title (15px), Description (13px), Price (15px bold)
- **Discount Badge:** Top-left overlay, blue background, white text
- **Stock Badge:** "Habis" when stock = 0
- **Stepper:** Pill-shaped, blue border, 34x34px buttons
- **Add Button:** Blue pill, 13px text, shadow

#### 4. Cart Bar
- **Position:** Fixed bottom
- **Height:** Auto with padding
- **Background:** White with top shadow
- **Content:** Item count, total price, "Bayar" button
- **Button:** Blue pill, 15px text, shadow

#### 5. Modal/Overlay
- **Background:** Semi-transparent black with blur
- **Animation:** Fade in 200ms
- **Sheet:** Slide up from bottom, 300ms
- **Border Radius:** 24px top corners
- **Max Height:** 88vh with scroll

#### 6. Admin Table
- **Header:** Gray background, uppercase labels
- **Rows:** White background, hover state
- **Image Thumbnail:** 48x48px
- **Action Buttons:** Edit (blue), Delete (red), 32x32px

#### 7. Toggle Switch
- **Size:** 48x26px
- **Background:** Gray (off), Blue (on)
- **Knob:** White circle, 20px
- **Animation:** 300ms slide

#### 8. Form Inputs
- **Height:** Auto with padding 12-14px
- **Border:** 1.5px solid, rounded corners
- **Focus:** Blue border with glow
- **Placeholder:** Muted color

---

## 🖨️ Print Design

### Report Print Style
- **Font:** Courier New (typewriter style)
- **Color:** Black on white
- **Layout:** Optimized for A4 paper
- **Sections:**
  - Header with border
  - Stats cards with dashed borders
  - Tables with monospace font
  - Order details with clear hierarchy

### Print Elements
- Hide: Navigation, buttons, search bars
- Show: Report content, stats, tables, order details
- Page Breaks: Avoid breaking cards and tables

---

## 📱 Responsive Design

### Breakpoints
- **Mobile:** < 480px
- **Desktop:** ≥ 480px

### Mobile Adaptations
- Header padding: 14-16px
- Logo size: 48x48px
- Brand name: 18px
- Subtitle: 13px
- Menu image: 68x68px
- Cart bar padding: 12-16px

### Desktop Features
- Max width: 480px centered
- Full padding: 16-20px
- Larger images and text
- More spacing between elements

---

## 🎯 User Experience

### Customer Flow
1. **Browse** - Scroll through categories and menus
2. **Select** - Click "Tambah" to add to cart
3. **Adjust** - Use stepper to change quantity
4. **Review** - Click "Bayar" to see cart review
5. **Note** - Add notes per item if needed
6. **Checkout** - Review total and confirm
7. **Pay** - Proceed to Midtrans Snap sandbox payment

### Admin Flow
1. **Login** - Authenticate through backend API
2. **Navigate** - Choose Dashboard/Menu/Report
3. **Manage** - Add/Edit/Delete menus
4. **Monitor** - View statistics and orders
5. **Report** - Generate and export reports
6. **Logout** - End session

### Micro-interactions
- **Button Hover:** Color change, slight lift
- **Button Click:** Scale down 96%
- **Toggle:** Smooth slide animation
- **Accordion:** Slide down with fade
- **Modal:** Fade in overlay, slide up sheet
- **Stepper:** Instant update with animation

---

## 🎨 Visual Hierarchy

### Customer Page
1. **Primary:** Menu items with images
2. **Secondary:** Prices and descriptions
3. **Tertiary:** Category labels
4. **Accent:** Discount badges, cart bar

### Admin Page
1. **Primary:** Data tables and stats
2. **Secondary:** Navigation tabs
3. **Tertiary:** Action buttons
4. **Accent:** Status badges (stock, discount)

---

## 🔧 Technical Implementation

### CSS Architecture
- **Custom Properties:** Design tokens for consistency
- **BEM-like Naming:** `.dk-component__element--modifier`
- **Mobile-First:** Base styles for mobile, media queries for desktop
- **Component-Based:** Each component has dedicated CSS section

### Animation Guidelines
- **Duration:** 150-300ms
- **Easing:** ease, ease-in-out
- **Transform:** scale, translate, rotate
- **Opacity:** fade in/out

### Accessibility
- **Contrast:** WCAG AA compliant
- **Focus States:** Visible on all interactive elements
- **ARIA Labels:** For icon buttons
- **Keyboard Navigation:** Tab through all elements
- **Screen Reader:** Semantic HTML structure

---

## 📐 Measurements

### Common Sizes
- **Icon:** 56x56px (desktop), 48x48px (mobile)
- **Button Height:** 40-48px
- **Input Height:** 44-48px
- **Card Padding:** 16px
- **Section Gap:** 20-24px

### Spacing Scale
```
4px   - Micro spacing
8px   - Small spacing
12px  - Compact spacing
16px  - Standard spacing
20px  - Medium spacing
24px  - Large spacing
32px  - Extra large spacing
```

---

## 🎯 Design Decisions

### Why White & Blue?
- **Professional:** Blue conveys trust and reliability
- **Clean:** White background reduces visual clutter
- **Food Industry:** Common in food delivery apps
- **Accessibility:** High contrast for readability

### Why Mobile-First?
- **Primary Use Case:** Most users order from mobile
- **Performance:** Smaller base CSS
- **Progressive Enhancement:** Add features for desktop
- **Future-Proof:** Mobile usage continues to grow

### Why Typewriter Font for Reports?
- **Professional:** Resembles official receipts
- **Readable:** Monospace aligns numbers perfectly
- **Print-Friendly:** Optimized for paper output
- **Distinct:** Differentiates reports from UI

---

## 📋 Checklist

### Visual Design
- [x] Color palette defined
- [x] Typography system established
- [x] Spacing scale created
- [x] Shadow system defined
- [x] Border radius standardized

### Components
- [x] Header designed
- [x] Menu items designed
- [x] Cart bar designed
- [x] Modals designed
- [x] Forms designed
- [x] Tables designed
- [x] Buttons designed

### Responsive
- [x] Mobile layout (< 480px)
- [x] Desktop layout (≥ 480px)
- [x] Touch targets (min 44x44px)
- [x] Readable text sizes

### Accessibility
- [x] Color contrast (WCAG AA)
- [x] Focus indicators
- [x] ARIA labels
- [x] Keyboard navigation
- [x] Semantic HTML

### Print
- [x] Report layout
- [x] Typography for print
- [x] Page breaks
- [x] Hidden elements

---

**Version:** 1.0  
**Last Updated:** 2026-07-04  
**Status:** Complete
