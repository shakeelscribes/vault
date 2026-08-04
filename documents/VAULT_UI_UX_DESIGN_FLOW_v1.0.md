# VAULT — UI/UX Design Flow Document

**Version:** 1.0  
**Status:** Approved Specification  
**Date:** August 2026  
**Classification:** Confidential  
**Companion Documents:** [VAULT PRD v1.0](file:///c:/Users/ahame/vault/docs/VAULT_PRD_v1.0.docx) · [VAULT TRD v1.0](file:///c:/Users/ahame/vault/documents/VAULT_TRD_v1.0.md) · [VAULT App Flow v1.0](file:///c:/Users/ahame/vault/documents/VAULT_APP_FLOW_v1.0.md)

---

## Table of Contents

1. [Design Philosophy & Aesthetic Direction](#1-design-philosophy--aesthetic-direction)
2. [Design Tokens & Color Palette](#2-design-tokens--color-palette)
3. [Typography & Numeric Formatting](#3-typography--numeric-formatting)
4. [Component Design System & Glassmorphism](#4-component-design-system--glassmorphism)
5. [Layout & Motion System](#5-layout--motion-system)
6. [Mobile PWA (iPhone 14 Plus) UX & Gestures](#6-mobile-pwa-iphone-14-plus-ux--gestures)
7. [Screen-by-Screen UI Layouts](#7-screen-by-screen-ui-layouts)
8. [Micro-Interactions & Haptic Feedback](#8-micro-interactions--haptic-feedback)
9. [Loading, Skeleton & Empty States](#9-loading-skeleton--empty-states)
10. [Accessibility & Theme Toggle Specification](#10-accessibility--theme-toggle-specification)

---

## 1. Design Philosophy & Aesthetic Direction

VAULT is designed with a **Dark-First, Premium Glassmorphic Financial Aesthetic**. It creates an intuitive, high-end experience that feels like a native iOS application on an iPhone 14 Plus while scaling seamlessly to desktop browsers on Windows.

### Core Visual Tenets

- **Dark Mode First:** Deep, rich navy backdrop (`#1A1A2E`) with subtle background radial gradients that eliminate eye strain and make financial data pop.
- **Glassmorphism & Depth:** Cards use translucent backdrops (`#16213E` with 70–80% opacity), backdrop blur effects (`backdrop-filter: blur(16px)`), and thin glowing borders (`rgba(255, 255, 255, 0.08)`).
- **Vibrant Financial Signals:** High-contrast color indicators for debits (Coral Red `#EF4444`), credits (Emerald Green `#10B981`), and category badges to ensure split-second readability.
- **Precision Typography:** Built with **Plus Jakarta Sans**, using tabular numbers for aligned financial columns.
- **Fluid Micro-Interactions:** Subtle haptic vibrations, smooth spring transitions, swipe-to-act card gestures, and interactive charts.

---

## 2. Design Tokens & Color Palette

### 2.1 Dark Mode Palette (Default)

```css
:root {
  /* Backgrounds */
  --bg-primary: #1A1A2E;           /* Deep Space Navy */
  --bg-secondary: #16213E;         /* Translucent Container Base */
  --bg-tertiary: #0F172A;          /* Inset Inputs & Dark Panels */
  --bg-glass: rgba(22, 33, 62, 0.75); /* Frosted Glass Container */
  
  /* Accent Colors */
  --accent-primary: #7C3AED;       /* Electric Purple / CTA Glow */
  --accent-primary-hover: #6D28D9;
  --accent-glow: rgba(124, 58, 237, 0.35);
  
  /* Financial Directional Colors */
  --color-debit: #EF4444;          /* Soft Coral Red */
  --color-debit-bg: rgba(239, 68, 68, 0.12);
  --color-debit-border: rgba(239, 68, 68, 0.25);
  
  --color-credit: #10B981;         /* Vibrant Emerald */
  --color-credit-bg: rgba(16, 185, 129, 0.12);
  --color-credit-border: rgba(16, 185, 129, 0.25);
  
  /* Budget Alert States */
  --state-safe: #10B981;           /* Under 80% */
  --state-warning: #F59E0B;        /* 80% to 99% (Amber) */
  --state-warning-bg: rgba(245, 158, 11, 0.15);
  --state-danger: #EF4444;         /* 100%+ (Red) */
  --state-danger-bg: rgba(239, 68, 68, 0.15);

  /* Category Badges */
  --cat-food: #F97316;             /* Warm Orange */
  --cat-transport: #3B82F6;        /* Bright Blue */
  --cat-shopping: #8B5CF6;         /* Soft Violet */
  --cat-bills: #F59E0B;            /* Amber */
  --cat-entertainment: #EC4899;    /* Hot Pink */
  --cat-health: #10B981;           /* Emerald */
  --cat-education: #6366F1;        /* Indigo */
  --cat-cash: #6B7280;             /* Muted Gray */
  --cat-transfer: #14B8A6;         /* Teal */
  --cat-other: #9CA3AF;            /* Neutral Slate */

  /* Text & Neutral Tokens */
  --text-primary: #F9FAFB;         /* Pure Light Gray */
  --text-secondary: #9CA3AF;       /* Muted Slate */
  --text-tertiary: #6B7280;        /* Subtle Subtitles */
  --border-glass: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(124, 58, 237, 0.5);
}
```

### 2.2 Light Mode Palette (Toggleable)

```css
[data-theme="light"] {
  --bg-primary: #F8FAFC;           /* Clean Off-White */
  --bg-secondary: #FFFFFF;         /* Solid White Card */
  --bg-tertiary: #F1F5F9;          /* Input Background */
  --bg-glass: rgba(255, 255, 255, 0.85);
  
  --accent-primary: #7C3AED;
  --accent-primary-hover: #6D28D9;
  --accent-glow: rgba(124, 58, 237, 0.15);

  --text-primary: #0F172A;         /* Dark Navy Text */
  --text-secondary: #475569;       /* Slate Neutral */
  --text-tertiary: #94A3B8;
  --border-glass: rgba(0, 0, 0, 0.08);
}
```

---

## 3. Typography & Numeric Formatting

VAULT uses **Plus Jakarta Sans** for all text elements. Numbers in transaction lists, cards, and budgets use `tabular-nums` to guarantee aligned columns.

### 3.1 Type Scale

| Role | Font Size | Weight | Line Height | Letter Spacing | CSS Equivalent |
|---|---|---|---|---|---|
| **Display Title** | 32px (2rem) | 800 (ExtraBold) | 1.2 | -0.02em | `font-extrabold text-3xl` |
| **Section Header (H1)** | 24px (1.5rem) | 700 (Bold) | 1.3 | -0.01em | `font-bold text-2xl` |
| **Card Header (H2)** | 18px (1.125rem) | 600 (SemiBold) | 1.4 | 0 | `font-semibold text-lg` |
| **Body Bold** | 15px (0.9375rem) | 600 (SemiBold) | 1.5 | 0 | `font-semibold text-sm` |
| **Body Regular** | 14px (0.875rem) | 400 (Regular) | 1.5 | 0 | `font-normal text-sm` |
| **Caption / Subtitle** | 12px (0.75rem) | 500 (Medium) | 1.4 | +0.01em | `font-medium text-xs` |
| **Financial Hero Amount**| 36px (2.25rem) | 800 (ExtraBold) | 1.1 | -0.03em | `font-mono-tabular font-extrabold text-4xl` |

### 3.2 Numeric Formatting Standard

- Currency Symbol: `₹` (Indian Rupee) always precedes the numeric value without spaces (e.g., `₹100.00`).
- Formatting Rule: Enforce `font-variant-numeric: tabular-nums` across all tables, lists, and summary cards.
- Negative / Debit: Red text or negative prefix `-₹130.00`.
- Positive / Credit: Green text or positive prefix `+₹464.00`.

---

## 4. Component Design System & Glassmorphism

### 4.1 Card Container (Glassmorphic)

```css
.vault-glass-card {
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: 16px; /* 1rem / rounded-2xl */
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.vault-glass-card:hover {
  border-color: rgba(124, 58, 237, 0.3);
  box-shadow: 0 12px 40px 0 rgba(124, 58, 237, 0.15);
}
```

### 4.2 Buttons & Action Controls

- **Primary CTA Button:** Glowing Electric Purple gradient (`linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)`), `border-radius: 12px`, with a soft purple shadow drop (`box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4)`).
- **Secondary Glass Button:** `background: rgba(255, 255, 255, 0.05)`, border `1px solid var(--border-glass)`, text color `var(--text-primary)`.
- **Floating Action Button (➕ FAB):** Elevated circular button (56px × 56px) with purple gradient, floating at the center of the mobile navbar, with `box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5)`.

### 4.3 Form Inputs & Dropdowns

- **Input Style:** `background: var(--bg-tertiary)`, `border: 1px solid var(--border-glass)`, `border-radius: 12px`, height `48px`.
- **Focus State:** Border changes to `var(--accent-primary)`, with a soft purple outer ring glow (`box-shadow: 0 0 0 3px var(--accent-glow)`).

---

## 5. Layout & Motion System

### 5.1 Mobile vs Desktop Grid Layout

- **Mobile (iPhone 14 Plus — 430px × 932px viewport):**
  - Single column, vertical stack with `padding: 16px`.
  - Fixed Header (Top: 0) + Floating Glass Bottom Nav Bar (Bottom: 16px).
- **Desktop (Windows Viewports ≥ 768px):**
  - Left Fixed Sidebar (Width: 240px) + Main Scrollable Canvas.
  - Multi-column Dashboard Grid (Summary Grid: 4 columns, Charts: 2 columns).

### 5.2 Motion & Transition Tokens

```css
:root {
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
}
```

- **Modal Entrance:** Slide-up from bottom with spring easing (`transform: translateY(0)` from `translateY(100%)`).
- **Toast Entrance:** Fade-in and slide down from top with `var(--ease-spring)`.
- **Feed Items:** Staggered list fade-in (`animation-delay: calc(index * 40ms)`).

---

## 6. Mobile PWA (iPhone 14 Plus) UX & Gestures

### 6.1 Floating Glass Navigation Bar

- **Position:** Fixed at bottom with `left: 16px`, `right: 16px`, `bottom: 16px`.
- **Style:** `height: 64px`, `border-radius: 24px`, `background: rgba(22, 33, 62, 0.85)`, `backdrop-filter: blur(20px)`.
- **Center ➕ FAB:** 56px diameter circle elevated 12px above the navbar line.

```
┌──────────────────────────────────────────────┐
│  🏠       📋       ➕       📊       ⚙️     │
│ Home     Txns     Add     Analy    Settings │
└──────────────────────────────────────────────┘
```

### 6.2 Mobile Touch Gestures

1. **Swipe Left on Transaction Card:**
   - Reveals quick action buttons behind the card: **Edit (Blue)** & **Delete (Red)**.
   - Smooth resistive drag up to 120px max offset.
2. **Pull Down to Refresh:**
   - Pulling down on the transaction list or dashboard triggers a spring-loaded spinner at top to re-sync data.
3. **Slide Down Sheet Dismissal:**
   - All modals contain a drag-handle indicator (`width: 36px`, `height: 4px`, rounded gray bar at top center). Dragging down >80px dismisses the sheet.

---

## 7. Screen-by-Screen UI Layouts

### 7.1 Welcome & Login Screen

```
┌──────────────────────────────────────────┐
│                                          │
│              🟣 VAULT                    │
│   Personal Expenditure Tracker           │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │  Username                            │ │
│ │  ┌────────────────────────────────┐  │ │
│ │  │ enter username                 │  │ │
│ │  └────────────────────────────────┘  │ │
│ │  Password                            │ │
│ │  ┌────────────────────────────────┐  │ │
│ │  │ •••••••••••••••             👁️ │  │ │
│ │  └────────────────────────────────┘  │ │
│ │                                      │ │
│ │  ┌────────────────────────────────┐  │ │
│ │  │           LOG IN               │  │ │
│ │  └────────────────────────────────┘  │ │
│ └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

### 7.2 Dashboard (Home)

- **Header Bar:** App Title "VAULT" (Left), Bell Notification Icon with active alert counter badge (Right).
- **Time Period Filter Pills:** `[ Today ]  [ This Week ]  [ This Month ]  [ Custom ]` horizontally scrollable.
- **Summary Cards (2×2 Grid):**
  - **Total Spent:** Red indicator dot, bold numbers.
  - **Total Received:** Green indicator dot, bold numbers.
  - **Net Balance:** Calculated difference.
  - **Peak Spend:** Highest single transaction.
- **Budget Warning Banner (Conditional):** Amber/Red alert card with progress bar and remaining balance tag.
- **Spending Trend Chart:** Bar chart with glowing purple vertical bars and gradient hover tooltips.
- **Category Donut Chart:** Interactive donut with central total spend text and legend tags.
- **Recent Transaction Feed:** List of recent transactions with category emojis, payment mode badges, and instant tap response.

---

## 8. Micro-Interactions & Haptic Feedback

### 8.1 Haptic Feedback Protocol (Mobile Web)

VAULT utilizes the standard Web Vibration API (`navigator.vibrate`) to provide physical tactile feedback on mobile devices:

| User Action | Vibration Pattern | Intensity / Duration |
|---|---|---|
| **Button Tap / Tab Switch** | Light Click | `navigator.vibrate(10)` |
| **Manual Entry Save Success** | Double Pulse | `navigator.vibrate([15, 30, 15])` |
| **Transaction Deleted** | Heavy Tap | `navigator.vibrate(40)` |
| **Budget Warning / Danger Alert** | Warning Pattern | `navigator.vibrate([50, 50, 50])` |

### 8.2 Live Toast Notification Banner

When a transaction is inserted via WebSocket:
1. Toast slides down from top of viewport.
2. Background: Translucent Navy with a 2px purple left border indicator.
3. Audio/Visual feedback: Soft entrance animation (`transform: translateY(0)` with spring bounce).
4. Includes dismiss `✕` and tap-to-view action.

---

## 9. Loading, Skeleton & Empty States

### 9.1 Skeleton Shimmer Animation

During initial page load or query fetching, content is replaced with animated glowing skeleton boxes:

```css
.skeleton-loader {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 9.2 Friendly Empty States

When a list or chart has zero data, friendly emoji-driven empty states are displayed instead of blank screens:

- **No Transactions:** 📭 *"No transactions found for this period. Add one manually or check your SMS automation!"*
- **No Budgets Set:** 🎯 *"No budgets set yet. Create your first budget to start tracking your limits!"*
- **No Notifications:** 🔔 *"All caught up! No unread alerts or notifications."*

---

## 10. Accessibility & Theme Toggle Specification

### 10.1 Accessibility (WCAG 2.1 AA Compliance)

- **Color Contrast:** Text tokens maintain a minimum contrast ratio of **4.5:1** against dark and glass backgrounds (`#F9FAFB` on `#16213E`).
- **Focus Rings:** Accessible keyboard navigation focus indicator (`outline: 2px solid #7C3AED; outline-offset: 2px`).
- **ARIA Attributes:** All dynamic modals use `role="dialog"`, buttons use explicit `aria-label` tags, and live WebSocket updates use `aria-live="polite"`.

### 10.2 Theme Switching Mechanism

Theme preference is toggleable via Settings → Appearance:
- Values: `System Default` (syncs with `prefers-color-scheme`), `Dark Mode`, `Light Mode`.
- Stored in `localStorage.getItem('vault_theme')` and applied to `document.documentElement.setAttribute('data-theme', theme)`.

---

> **End of Document — VAULT UI/UX Design Flow v1.0**
