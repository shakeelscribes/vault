# VAULT — App Flow Document

**Version:** 1.0  
**Status:** Draft  
**Date:** August 2026  
**Classification:** Confidential  
**Companion Documents:** [VAULT PRD v1.0](file:///c:/Users/ahame/vault/docs/VAULT_PRD_v1.0.docx) · [VAULT TRD v1.0](file:///c:/Users/ahame/vault/documents/VAULT_TRD_v1.0.md)

---

## Table of Contents

1. [Screen Map & Navigation](#1-screen-map--navigation)
2. [Flow 1 — First Launch & Onboarding](#2-flow-1--first-launch--onboarding)
3. [Flow 2 — Login](#3-flow-2--login)
4. [Flow 3 — Setup Wizard](#4-flow-3--setup-wizard)
5. [Flow 4 — Dashboard](#5-flow-4--dashboard)
6. [Flow 5 — SMS Capture (Background)](#6-flow-5--sms-capture-background)
7. [Flow 6 — Transaction Detail & Edit](#7-flow-6--transaction-detail--edit)
8. [Flow 7 — Manual Entry](#8-flow-7--manual-entry)
9. [Flow 8 — Transactions List & Search](#9-flow-8--transactions-list--search)
10. [Flow 9 — Analytics](#10-flow-9--analytics)
11. [Flow 10 — Budgets](#11-flow-10--budgets)
12. [Flow 11 — PDF Upload & Import](#12-flow-11--pdf-upload--import)
13. [Flow 12 — Notifications Center](#13-flow-12--notifications-center)
14. [Flow 13 — Settings](#14-flow-13--settings)
15. [Flow 14 — Export & Share](#15-flow-14--export--share)
16. [Flow 15 — Flagged Transactions Review](#16-flow-15--flagged-transactions-review)
17. [Flow 16 — Offline Behavior](#17-flow-16--offline-behavior)
18. [Flow 17 — Error States](#18-flow-17--error-states)
19. [Navigation Map (Complete)](#19-navigation-map-complete)

---

## 1. Screen Map & Navigation

### 1.1 All Screens

```
VAULT App
│
├── Splash Screen (first launch only)
├── Login Page
├── Setup Wizard (first login only)
│   ├── Step 1: Welcome
│   ├── Step 2: iOS Shortcut Setup
│   ├── Step 3: Default Categories
│   ├── Step 4: First Budget
│   └── Step 5: Done / Test Connection
│
├── ── Bottom Nav Bar ──────────────────
│   ├── 🏠 Dashboard (default tab)
│   ├── 📋 Transactions
│   ├── 📊 Analytics
│   ├── 💰 Budgets
│   └── ⚙️ Settings
│
├── ── Overlay / Modal Screens ──────────
│   ├── Manual Entry (FAB → modal)
│   ├── Transaction Detail (tap → slide-up)
│   ├── PDF Upload (dashboard button → modal)
│   ├── Notification Center (bell icon → slide-in)
│   ├── Budget Create/Edit (modal)
│   ├── Category Create/Edit (modal)
│   ├── Flagged Transaction Review (modal)
│   ├── Export Options (modal)
│   └── Search & Filter (full-screen overlay)
│
└── ── Error / Offline States ──────────
    ├── "You're offline" banner
    ├── "Server unreachable" banner
    ├── "Couldn't parse SMS" card
    └── "Upload failed" dialog
```

### 1.2 Bottom Navigation Bar (Mobile)

| Position | Icon | Label | Screen |
|---|---|---|---|
| 1 | 🏠 | Home | Dashboard |
| 2 | 📋 | Txns | Transactions list + search |
| 3 | ➕ | Add | Manual Entry (FAB, center, elevated) |
| 4 | 📊 | Analytics | Charts & insights |
| 5 | ⚙️ | More | Settings + Budgets + PDF Upload |

> **Note:** The center "+" button is elevated (floating above the bar) and always accessible from any screen.

### 1.3 Desktop Navigation (Windows / Wide Screen)

On screens ≥ 768px, the bottom nav becomes a **left sidebar**:

```
┌──────────┬──────────────────────────────────────┐
│ VAULT    │                                      │
│          │                                      │
│ 🏠 Home  │       Main Content Area              │
│ 📋 Txns  │                                      │
│ 📊 Analy │                                      │
│ 💰 Budget│                                      │
│ 📄 PDF   │                                      │
│          │                                      │
│ ─────── │                                      │
│ 🔔 Notif │                                      │
│ ⚙️ Sett  │                                      │
│ 🚪 Log   │                                      │
└──────────┴──────────────────────────────────────┘
```

---

## 2. Flow 1 — First Launch & Onboarding

### 2.1 Splash Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│         🟣 VAULT            │
│                             │
│   Personal Expenditure      │
│   Analysis & Tracker        │
│                             │
│                             │
│         ● ● ●               │
│      Loading...             │
│                             │
└─────────────────────────────┘
```

**Behavior:**
1. App opens → Splash screen appears (1.5 seconds)
2. Check auth state:
   - If **no session** → Navigate to Login Page
   - If **valid session** → Navigate to Dashboard
   - If **valid session + first login (no setup complete)** → Navigate to Setup Wizard

**Visual:**
- Background: Deep navy (`#1A1A2E`) or white (based on system theme)
- VAULT logo: Purple (`#7C3AED`), large, centered
- Subtle fade-in animation
- Loading dots animation at bottom

---

### 2.2 Decision Flow

```
App Opens
    │
    ▼
Splash Screen (1.5s)
    │
    ▼
Check Auth Session
    │
    ├── No session ──────────────▶ Login Page
    │
    ├── Session exists
    │   │
    │   ├── setup_complete = false ─▶ Setup Wizard
    │   │
    │   └── setup_complete = true ──▶ Dashboard
    │
    └── Session expired ────────────▶ Login Page
```

---

## 3. Flow 2 — Login

### 3.1 Login Screen

```
┌─────────────────────────────┐
│                             │
│         🟣 VAULT            │
│                             │
│   Welcome back              │
│                             │
│   ┌───────────────────────┐ │
│   │ Username              │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │ Password          👁️  │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │       Log In          │ │
│   └───────────────────────┘ │
│                             │
│   Forgot password?          │
│                             │
└─────────────────────────────┘
```

### 3.2 Login Flow

```
Login Screen
    │
    ▼
User enters username + password
    │
    ▼
Tap "Log In"
    │
    ▼
Show loading spinner on button
    │
    ▼
POST /api/auth/login { username, password }
    │
    ├── 200 OK ──────────────────────▶ Store JWT in httpOnly cookie
    │                                       │
    │                                       ├── First login? ──▶ Setup Wizard
    │                                       │
    │                                       └── Returning? ────▶ Dashboard
    │
    ├── 401 Unauthorized ───────────▶ Show error: "Invalid username or password"
    │                                  Clear password field
    │                                  Focus password field
    │
    └── 500 / Network Error ────────▶ Show error: "Server unreachable. Try again."
                                      Show "Retry" button
```

### 3.3 Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| Username | Required, min 3 chars | "Username is required" / "Too short" |
| Password | Required, min 8 chars | "Password is required" / "Too short" |
| Both empty | Both required | "Please enter your credentials" |

### 3.4 Security

- Password field: toggle visibility with 👁️ icon
- Auto-login: if JWT is valid, skip login screen (30-day session)
- After 5 failed attempts: show "Too many attempts. Try again in 5 minutes."
- All passwords hashed with bcrypt (server-side)

---

## 4. Flow 3 — Setup Wizard

> **When:** Only shown on first login (when `setup_complete = false` in user profile).  
> **After completion:** `setup_complete` is set to `true`, wizard never shows again.  
> **Can be re-accessed:** From Settings → "Re-run Setup Wizard"

### 4.1 Step 1 — Welcome

```
┌─────────────────────────────┐
│                             │
│         🟣 VAULT            │
│                             │
│   Let's set up your         │
│   expense tracker           │
│                             │
│   We'll walk you through    │
│   3 quick steps:            │
│                             │
│   1️⃣ Connect iOS Shortcut   │
│   2️⃣ Set up categories      │
│   3️⃣ Create your first      │
│      budget                 │
│                             │
│   ┌───────────────────────┐ │
│   │     Get Started →     │ │
│   └───────────────────────┘ │
│                             │
│   Skip setup (not recommended)│
│                             │
└─────────────────────────────┘
```

**Actions:**
- "Get Started" → Navigate to Step 2
- "Skip setup" → Mark `setup_complete = true`, go to Dashboard (toast: "You can finish setup anytime in Settings")

---

### 4.2 Step 2 — iOS Shortcut Setup

```
┌─────────────────────────────┐
│ ← Back          Step 1 of 3 │
│                             │
│   📱 Connect iOS Shortcut   │
│                             │
│   This lets VAULT auto-     │
│   capture your bank SMS.    │
│                             │
│   ┌─────────────────────┐   │
│   │ Step-by-step guide  │   │
│   │ with screenshots    │   │
│   │                     │   │
│   │ 1. Open Shortcuts   │   │
│   │ 2. Automation tab   │   │
│   │ 3. New Automation   │   │
│   │ 4. "When I receive  │   │
│   │     a message"      │   │
│   │ 5. [screenshot]     │   │
│   │ ...                 │   │
│   └─────────────────────┘   │
│                             │
│   Your API Key:             │
│   ┌──────────────────┐      │
│   │ vault_sk_xxx  📋  │     │
│   └──────────────────┘      │
│                             │
│   Your Backend URL:         │
│   ┌──────────────────┐      │
│   │ https://...   📋  │     │
│   └──────────────────┘      │
│                             │
│   ┌───────────────────────┐ │
│   │  🧪 Test Connection   │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │     Next Step →       │ │
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

**Flow:**

```
User reads step-by-step guide
    │
    ├── Taps 📋 (copy API key) → Copies to clipboard → Toast: "API key copied"
    │
    ├── Taps 📋 (copy URL) → Copies to clipboard → Toast: "URL copied"
    │
    ├── Taps "Test Connection"
    │       │
    │       ▼
    │   Backend sends a test request → checks if shortcut POSTs back
    │       │
    │       ├── Success → ✅ "Connection verified! SMS capture is working."
    │       │
    │       └── Fail (timeout 30s) → ⚠️ "No response. Make sure the shortcut is set up correctly."
    │                                    Show "Try Again" + "Skip for now"
    │
    └── Taps "Next Step" → Navigate to Step 3
```

**Scrollable guide content includes:**
- 6 numbered steps with iOS 26 screenshots
- Emphasis on "Ask Before Running → OFF"
- Emphasis on "All messages, then filter inside shortcut"
- Copy-paste blocks for API key and backend URL
- "What to put in the shortcut body" JSON example

---

### 4.3 Step 3 — Default Categories

```
┌─────────────────────────────┐
│ ← Back          Step 2 of 3 │
│                             │
│   🗂️ Your Categories        │
│                             │
│   We've set up defaults.    │
│   You can edit these later. │
│                             │
│   ✅ 🍕 Food & Dining       │
│   ✅ 🚗 Transport            │
│   ✅ 🛍️ Shopping             │
│   ✅ 💡 Bills & Utilities    │
│   ✅ 🎬 Entertainment       │
│   ✅ 💊 Health               │
│   ✅ 📚 Education            │
│   ✅ 🏧 Cash Withdrawal      │
│   ✅ 🏦 Transfer             │
│   ✅ 📦 Other                │
│                             │
│   ┌───────────────────────┐ │
│   │  + Add Custom Category│ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │     Next Step →       │ │
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

**Actions:**
- Toggle categories on/off (disable any you don't need)
- Tap "+ Add Custom Category" → opens inline form: Name + Emoji + Color picker
- "Next Step" → Navigate to Step 4

---

### 4.4 Step 4 — First Budget

```
┌─────────────────────────────┐
│ ← Back          Step 3 of 3 │
│                             │
│   💰 Set Your First Budget  │
│                             │
│   Category:                 │
│   ┌───────────────────────┐ │
│   │ Overall Spending   ▼  │ │
│   └───────────────────────┘ │
│                             │
│   Period:                   │
│   ┌──────┐┌──────┐┌──────┐ │
│   │Daily ││Weekly││Month.│ │
│   └──────┘└──────┘└──────┘ │
│            ▲ selected       │
│                             │
│   Amount:                   │
│   ┌───────────────────────┐ │
│   │ ₹                     │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │   Finish Setup ✅     │ │
│   └───────────────────────┘ │
│                             │
│   Skip for now              │
│                             │
└─────────────────────────────┘
```

**Flow:**

```
User selects category (dropdown with all active categories + "Overall")
    │
    ▼
User selects period: Daily / Weekly / Monthly (pill buttons)
    │
    ▼
User enters amount
    │
    ▼
Tap "Finish Setup"
    │
    ▼
POST /api/budgets { category_id, period, amount }
    │
    ▼
Set user.setup_complete = true
    │
    ▼
Navigate to Dashboard
    │
    ▼
Toast: "🎉 You're all set! VAULT is now tracking your expenses."
```

---

## 5. Flow 4 — Dashboard

### 5.1 Dashboard Layout (Mobile)

```
┌─────────────────────────────┐
│ VAULT              🔔 (3)   │ ← Header: logo + notification bell with badge
│─────────────────────────────│
│                             │
│ This Week          ▼       │ ← Period selector dropdown
│                             │
│ ┌─────────┐┌─────────┐     │
│ │ ₹4,520  ││ ₹50,000 │     │ ← Summary cards
│ │ Spent   ││ Received│     │
│ └─────────┘└─────────┘     │
│ ┌─────────┐┌─────────┐     │
│ │ ₹45,480 ││ ₹1,200  │     │
│ │ Net     ││ Biggest │     │
│ └─────────┘└─────────┘     │
│                             │
│ ⚠️ Food & Dining at 82%    │ ← Budget alert banner (red/yellow)
│   of monthly budget         │
│                             │
│ 📊 Spending Trend           │ ← Bar chart (daily spend this week)
│ ┌───────────────────────┐   │
│ │ ▓▓▓▓                  │   │
│ │ ▓▓▓▓▓▓▓               │   │
│ │ ▓▓                    │   │
│ │ ▓▓▓▓▓                 │   │
│ │ Mo Tu We Th Fr Sa Su  │   │
│ └───────────────────────┘   │
│                             │
│ 🍩 By Category              │ ← Donut chart
│ ┌───────────────────────┐   │
│ │    🍕 35%  🛍️ 25%     │   │
│ │       ( donut )        │   │
│ │    🚗 20%  💡 20%     │   │
│ └───────────────────────┘   │
│                             │
│ 💳 By Payment Mode          │ ← Pie chart
│ ┌───────────────────────┐   │
│ │  UPI 65%  Card 25%    │   │
│ │     ( pie chart )      │   │
│ │  ATM 5%   NEFT 5%    │   │
│ └───────────────────────┘   │
│                             │
│ 💰 Budget Progress          │ ← Budget bars
│ ┌───────────────────────┐   │
│ │ Food     ████████░░ 82%│  │
│ │ Shopping ███░░░░░░░ 30%│  │
│ │ Overall  █████░░░░░ 50%│  │
│ └───────────────────────┘   │
│                             │
│ 📄 Upload Statement  ↑     │ ← PDF upload button
│                             │
│ 📋 Recent Transactions      │ ← Live transaction feed
│ ┌───────────────────────┐   │
│ │ 🍕 Zomato    -₹100    │   │
│ │ UPI • Today 2:35 PM   │   │
│ ├───────────────────────┤   │
│ │ 🏦 NARMILA   +₹464    │   │
│ │ UPI • Jul 31 11:20 AM │   │
│ ├───────────────────────┤   │
│ │ 💳 POS Txn   -₹130    │   │
│ │ Card • Aug 2 6:45 PM  │   │
│ ├───────────────────────┤   │
│ │ ✋ Manual    -₹50      │   │
│ │ Cash • Aug 3 8:00 AM  │   │ ← Manual entries have ✋ icon
│ └───────────────────────┘   │
│       View All →            │
│                             │
│─────────────────────────────│
│ 🏠    📋    ➕    📊    ⚙️   │ ← Bottom nav
└─────────────────────────────┘
```

### 5.2 Dashboard Interactions

```
Dashboard Screen
    │
    ├── Tap period selector ("This Week ▼")
    │       └── Dropdown: Today / This Week / This Month / Custom Date Range
    │           └── Updates all charts + summary cards + transaction feed
    │
    ├── Tap 🔔 notification bell
    │       └── Opens Notification Center (slide-in from right)
    │
    ├── Tap any Summary Card
    │       └── No action (display only)
    │
    ├── Tap budget alert banner (⚠️)
    │       └── Navigate to Budgets tab
    │
    ├── Tap donut chart category segment
    │       └── Navigate to Transactions tab, pre-filtered by that category
    │
    ├── Tap pie chart payment mode segment
    │       └── Navigate to Transactions tab, pre-filtered by that mode
    │
    ├── Tap budget progress bar
    │       └── Navigate to Budgets tab, scroll to that budget
    │
    ├── Tap "Upload Statement" button
    │       └── Opens PDF Upload modal
    │
    ├── Tap any transaction card
    │       └── Opens Transaction Detail modal (slide-up)
    │
    ├── Tap "View All →"
    │       └── Navigate to Transactions tab
    │
    └── Tap ➕ FAB (center of bottom nav)
            └── Opens Manual Entry modal
```

### 5.3 Real-Time Update (WebSocket)

```
New SMS captured in background
    │
    ▼
Backend parses → inserts to DB
    │
    ▼
Supabase Realtime broadcasts INSERT
    │
    ▼
Dashboard receives via WebSocket
    │
    ▼
┌──────────────────────────────────────────┐
│ Toast notification appears at top:        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 🍕 ₹100 debited — Zomato          │  │
│  │    Food & Dining • UPI • Just now  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Auto-dismisses after 5 seconds          │
│  Tap toast → opens Transaction Detail    │
└──────────────────────────────────────────┘
    │
    ▼
Summary cards re-calculate (animated counter)
Charts re-render with new data point
Transaction feed: new item slides in at top with highlight animation
Budget bars re-calculate (if applicable)
Budget alert banner appears (if threshold crossed)
```

---

## 6. Flow 5 — SMS Capture (Background)

> This flow happens entirely in the background. The user never sees it directly — they only see the result on the dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKGROUND PROCESS                            │
│                                                                 │
│  1. ANY SMS arrives on iPhone                                   │
│     │                                                           │
│  2. iOS 26 Shortcut triggers automatically                      │
│     │                                                           │
│  3. IF sms_body CONTAINS "Canara" OR "CANBNK"                  │
│     │   ├── NO → EXIT (do nothing)                              │
│     │   └── YES ↓                                               │
│     │                                                           │
│  4. POST to backend:                                            │
│     {                                                           │
│       "raw_sms": "Dear Customer, Acct XXX430 Dr...",            │
│       "timestamp": "2026-08-03T14:35:00+05:30"                  │
│     }                                                           │
│     Headers: { "X-Vault-API-Key": "vault_sk_xxx" }              │
│     │                                                           │
│  5. Backend validates API key                                   │
│     │   ├── Invalid → 401 (shortcut ignores response)           │
│     │   └── Valid ↓                                             │
│     │                                                           │
│  6. Pre-filter: contains "INR" AND ("Acct" OR "A/c")           │
│     │   ├── NO → 200 { "status": "ignored" }                   │
│     │   └── YES ↓                                               │
│     │                                                           │
│  7. OTP filter: contains "OTP" or "one-time"                   │
│     │   ├── YES → 200 { "status": "ignored", "reason": "otp" } │
│     │   └── NO ↓                                                │
│     │                                                           │
│  8. Send to Groq AI:                                            │
│     raw_sms → Llama 3.1 70B → structured JSON                  │
│     │                                                           │
│     │   ├── Parse failed → Insert with is_flagged = true        │
│     │   │                  flag_reason = "parse_failed"          │
│     │   │                                                       │
│     │   ├── Confidence < 0.7 → Insert with is_flagged = true    │
│     │   │                      flag_reason = "low_confidence"    │
│     │   │                                                       │
│     │   └── Confidence ≥ 0.7 → Normal insert ↓                 │
│     │                                                           │
│  9. Check merchant_mappings for category override               │
│     │                                                           │
│ 10. Insert into transactions table                              │
│     │                                                           │
│ 11. Check budget thresholds                                     │
│     │   ├── ≥ 80% → Create budget_alert (threshold = 80)        │
│     │   └── ≥ 100% → Create budget_alert (threshold = 100)      │
│     │                                                           │
│ 12. Supabase Realtime broadcasts INSERT                         │
│     │                                                           │
│ 13. Dashboard updates live ✅                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Flow 6 — Transaction Detail & Edit

### 7.1 Transaction Detail Modal

> **Triggered by:** Tapping any transaction card in the dashboard feed or transactions list.

```
┌─────────────────────────────┐
│ Transaction Detail    ✕     │ ← Slide-up modal
│─────────────────────────────│
│                             │
│     🍕 Zomato               │ ← Merchant name (large)
│     ₹100.00                 │ ← Amount (large, red for debit, green for credit)
│                             │
│ ┌───────────────────────┐   │
│ │ Type       Debit      │   │
│ │ Mode       UPI        │   │
│ │ Category   Food       │   │ ← Tap to edit
│ │ Date       3 Aug 2026 │   │
│ │ Time       2:35 PM    │   │
│ │ UPI Ref    657803...  │   │
│ │ Balance    ₹984.03    │   │
│ │ Source     SMS ✉️      │   │ ← SMS / PDF / Manual ✋
│ └───────────────────────┘   │
│                             │
│ Note:                       │
│ ┌───────────────────────┐   │
│ │ Add a note...         │   │ ← Tap to type
│ └───────────────────────┘   │
│                             │
│ Raw SMS:                    │ ← Collapsible section
│ ┌───────────────────────┐   │
│ │ "Dear Customer, Acct  │   │
│ │  XXX430 Dr. INR 100..." │  │
│ └───────────────────────┘   │
│                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ Edit │ │ 🔁   │ │ 🗑️   │ │ ← Action buttons
│ │      │ │Recur.│ │Delete│ │
│ └──────┘ └──────┘ └──────┘ │
│                             │
└─────────────────────────────┘
```

### 7.2 Edit Transaction Flow

```
Tap "Edit" button
    │
    ▼
Fields become editable:
  - Merchant name (text input)
  - Category (dropdown)
  - Payment mode (dropdown)
  - Note (text area)
    │
    ▼
User makes changes
    │
    ▼
Tap "Save"
    │
    ▼
PATCH /api/transactions/:id
    │
    ├── If category changed:
    │       └── Upsert merchant_mapping (merchant → new category)
    │           └── Toast: "Future [Merchant] transactions will be categorised as [Category]"
    │
    ├── Creates audit_log entry with old + new values
    │
    └── 200 OK → Toast: "Transaction updated" → Modal closes
```

### 7.3 Delete Transaction Flow

```
Tap 🗑️ Delete
    │
    ▼
Confirmation dialog:
  "Delete this transaction?"
  "₹100 — Zomato (3 Aug 2026)"
  [Cancel]  [Delete]
    │
    ├── Cancel → Close dialog
    │
    └── Delete → PATCH /api/transactions/:id { is_deleted: true }
                    │
                    ▼
                 Soft delete (not permanent)
                    │
                    ▼
                 Toast: "Transaction deleted" + [Undo] button (5 seconds)
                    │
                    ├── Tap Undo → PATCH is_deleted: false → Toast: "Restored"
                    │
                    └── 5 seconds pass → Undo disappears, delete is final
```

### 7.4 Mark as Recurring

```
Tap 🔁 Recurring
    │
    ▼
Dialog: "Mark as recurring?"
  Frequency: [Weekly ▼] / Monthly / Yearly
  "VAULT will track this as a subscription"
  [Cancel]  [Mark Recurring]
    │
    ▼
Transaction tagged as recurring
Toast: "Marked as recurring (Monthly)"
```

---

## 8. Flow 7 — Manual Entry

### 8.1 Manual Entry Modal

> **Triggered by:** Tapping the ➕ FAB button (center of bottom nav, always visible).

```
┌─────────────────────────────┐
│ New Transaction       ✕     │ ← Slide-up modal
│─────────────────────────────│
│                             │
│ Type:                       │
│ ┌───────────┐┌───────────┐  │
│ │  Expense  ││  Income   │  │ ← Toggle (Expense selected by default)
│ └───────────┘└───────────┘  │
│                             │
│ Amount: *                   │
│ ┌───────────────────────┐   │
│ │ ₹                     │   │ ← Numeric keyboard opens
│ └───────────────────────┘   │
│                             │
│ Category: *                 │
│ ┌───────────────────────┐   │
│ │ Select category    ▼  │   │ ← Dropdown with emoji icons
│ └───────────────────────┘   │
│                             │
│ Payment Mode:               │
│ ┌──────┐┌──────┐┌──────┐   │
│ │ Cash ││ UPI  ││ Card │   │ ← Pill selector (Cash default)
│ └──────┘└──────┘└──────┘   │
│ ┌──────┐┌──────┐            │
│ │ NEFT ││Other │            │
│ └──────┘└──────┘            │
│                             │
│ Merchant:                   │
│ ┌───────────────────────┐   │
│ │ e.g., Tea stall       │   │ ← Optional, text input
│ └───────────────────────┘   │
│                             │
│ Date:                       │
│ ┌───────────────────────┐   │
│ │ 📅 Pick a date        │   │ ← Date picker (NO default)
│ └───────────────────────┘   │
│                             │
│ Note:                       │
│ ┌───────────────────────┐   │
│ │ Optional note         │   │
│ └───────────────────────┘   │
│                             │
│ ── Quick Presets ──         │
│ ┌────┐ ┌──────┐ ┌───────┐  │
│ │☕₹10│ │🍵₹15 │ │🚌₹20  │  │ ← One-tap entries
│ └────┘ └──────┘ └───────┘  │
│ ┌──────┐ ┌────────┐        │
│ │🥤₹30 │ │⛽₹100  │        │
│ └──────┘ └────────┘        │
│                             │
│ ┌───────────────────────┐   │
│ │     Save Transaction  │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### 8.2 Manual Entry Flow

```
User taps ➕ FAB
    │
    ▼
Modal slides up
    │
    ├── Option A: Fill form manually
    │       Amount → Category → Mode → Merchant → Date → Note
    │       │
    │       ▼
    │   Tap "Save Transaction"
    │       │
    │       ▼
    │   Validate: amount required, category required, date required
    │       │
    │       ├── Validation fails → Highlight red borders + error text
    │       │
    │       └── Valid → POST /api/transactions/manual
    │                       │
    │                       ▼
    │                   201 Created
    │                       │
    │                       ▼
    │                   Modal closes
    │                   Toast: "₹50 added (Cash — Tea stall)"
    │                   Dashboard updates (WebSocket broadcast)
    │
    └── Option B: Tap a Quick Preset
            │
            ▼
        Pre-fills: amount + category + mode (Cash) + merchant name
        Date picker still needs to be filled
            │
            ▼
        User picks date → Tap "Save Transaction"
```

### 8.3 Quick Presets (Configurable)

| Preset | Amount | Category | Mode | Merchant |
|---|---|---|---|---|
| ☕ ₹10 | 10 | Food & Dining | Cash | Chai |
| 🍵 ₹15 | 15 | Food & Dining | Cash | Tea |
| 🚌 ₹20 | 20 | Transport | Cash | Bus |
| 🥤 ₹30 | 30 | Food & Dining | Cash | Juice |
| ⛽ ₹100 | 100 | Transport | Cash | Fuel |

> **Note:** Quick presets are editable in Settings → "Manage Quick Presets"

### 8.4 Visual Distinction

Manual entries in the transaction feed show a **✋ icon** instead of the payment mode icon:

```
┌───────────────────────────────┐
│ ✋ Tea stall         -₹10     │ ← Manual entry
│    Cash • Aug 3 • 8:00 AM    │
├───────────────────────────────┤
│ 🔵 Zomato           -₹100    │ ← SMS entry (UPI icon)
│    UPI • Aug 3 • 2:35 PM     │
└───────────────────────────────┘
```

---

## 9. Flow 8 — Transactions List & Search

### 9.1 Transactions Screen

```
┌─────────────────────────────┐
│ Transactions         🔍     │ ← Search icon
│─────────────────────────────│
│                             │
│ ┌──────┐┌──────┐┌──────┐   │ ← Quick filter pills
│ │ All  ││Debit ││Credit│   │
│ └──────┘└──────┘└──────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ 🔍 Search merchants...│   │ ← Global search bar
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ Filters ▼             │   │ ← Expandable filter panel
│ │                       │   │
│ │ Date: [Aug 1] → [Aug 3]│  │
│ │ Mode: [All ▼]         │   │
│ │ Category: [All ▼]     │   │
│ │ Amount: [₹0] → [₹∞]  │   │
│ │                       │   │
│ │ [Apply] [Reset]       │   │
│ └───────────────────────┘   │
│                             │
│ ── Aug 3, 2026 ──           │ ← Date separator
│ ┌───────────────────────┐   │
│ │ 🍕 Zomato    -₹100    │   │
│ │ UPI • 2:35 PM         │   │
│ ├───────────────────────┤   │
│ │ ✋ Chai       -₹10     │   │
│ │ Cash • 8:00 AM        │   │
│ └───────────────────────┘   │
│                             │
│ ── Aug 2, 2026 ──           │
│ ┌───────────────────────┐   │
│ │ 💳 POS Txn   -₹130    │   │
│ │ Card • 6:45 PM        │   │
│ └───────────────────────┘   │
│                             │
│ ── Jul 31, 2026 ──          │
│ ┌───────────────────────┐   │
│ │ 🏦 NARMILA   +₹464    │   │
│ │ UPI • 11:20 AM        │   │
│ ├───────────────────────┤   │
│ │ 🏦 ETERNAL   +₹409    │   │
│ │ NEFT • 9:15 AM        │   │
│ └───────────────────────┘   │
│                             │
│      Loading more...        │ ← Infinite scroll (loads 50 at a time)
│                             │
│─────────────────────────────│
│ 🏠    📋    ➕    📊    ⚙️   │
└─────────────────────────────┘
```

### 9.2 Search Flow

```
Tap 🔍 search icon or search bar
    │
    ▼
Full-screen search overlay opens
Keyboard appears
    │
    ▼
User types "Zomato"
    │
    ▼
Debounced search (300ms delay) → GET /api/transactions?search=Zomato
    │
    ▼
Results update live as user types
    │
    ▼
Tap a result → Opens Transaction Detail modal
    │
    ▼
Tap ✕ or swipe back → Close search, return to list
```

### 9.3 Filter Flow

```
Tap "Filters ▼"
    │
    ▼
Filter panel expands (animated)
    │
    ▼
User sets:
  - Date range: Aug 1 → Aug 3 (date pickers)
  - Payment mode: UPI (dropdown: All / UPI / Card / ATM / NEFT / Cash)
  - Category: Food & Dining (dropdown with emoji)
  - Amount range: ₹50 → ₹500 (two number inputs)
    │
    ▼
Tap "Apply"
    │
    ▼
GET /api/transactions?start_date=2026-08-01&end_date=2026-08-03&payment_mode=upi&category_id=xxx&min_amount=50&max_amount=500
    │
    ▼
List updates with filtered results
Active filter count shown: "Filters (3)"
    │
    ▼
Tap "Reset" → Clears all filters, shows all transactions
```

---

## 10. Flow 9 — Analytics

### 10.1 Analytics Screen

```
┌─────────────────────────────┐
│ Analytics                   │
│─────────────────────────────│
│                             │
│ ┌──────┐┌──────┐┌──────┐   │ ← Period pills
│ │ Week ││Month ││Year  │   │
│ └──────┘└──────┘└──────┘   │
│                             │
│ 📈 Spending Trend           │
│ ┌───────────────────────┐   │
│ │                       │   │
│ │  Line chart showing   │   │
│ │  daily spend over     │   │
│ │  selected period      │   │
│ │                       │   │
│ └───────────────────────┘   │
│                             │
│ 🍩 Category Breakdown       │
│ ┌───────────────────────┐   │
│ │                       │   │
│ │  Donut chart +        │   │
│ │  ranked list below:   │   │
│ │                       │   │
│ │  1. 🍕 Food    ₹4,500│   │
│ │  2. 🛍️ Shop   ₹3,200│   │
│ │  3. 🚗 Trans  ₹2,100│   │
│ │  4. 💡 Bills  ₹1,800│   │
│ └───────────────────────┘   │
│                             │
│ 💳 Payment Mode Split       │
│ ┌───────────────────────┐   │
│ │  Horizontal stacked   │   │
│ │  bar chart:           │   │
│ │                       │   │
│ │  UPI ████████ 65%     │   │
│ │  Card ███ 25%         │   │
│ │  Cash █ 8%            │   │
│ │  NEFT ░ 2%            │   │
│ └───────────────────────┘   │
│                             │
│ 📊 Debit vs Credit          │
│ ┌───────────────────────┐   │
│ │                       │   │
│ │  Side-by-side bars    │   │
│ │  Debit: ₹15,420      │   │
│ │  Credit: ₹50,000     │   │
│ │  Net: +₹34,580       │   │
│ │                       │   │
│ └───────────────────────┘   │
│                             │
│ 🏆 Top Merchants            │
│ ┌───────────────────────┐   │
│ │ 1. Zomato     ₹2,400  │   │
│ │ 2. Amazon     ₹1,800  │   │
│ │ 3. Swiggy     ₹1,200  │   │
│ │ 4. Flipkart   ₹800    │   │
│ │ 5. Reliance   ₹600    │   │
│ └───────────────────────┘   │
│                             │
│─────────────────────────────│
│ 🏠    📋    ➕    📊    ⚙️   │
└─────────────────────────────┘
```

### 10.2 Analytics Interactions

```
Analytics Screen
    │
    ├── Tap period pill (Week / Month / Year)
    │       └── All charts re-render for selected period
    │
    ├── Tap category in ranked list
    │       └── Navigate to Transactions, pre-filtered by category + period
    │
    ├── Tap merchant in top merchants
    │       └── Navigate to Transactions, pre-filtered by merchant name
    │
    └── Pull to refresh
            └── Re-fetch all data
```

---

## 11. Flow 10 — Budgets

### 11.1 Budgets Screen

```
┌─────────────────────────────┐
│ Budgets             + New   │
│─────────────────────────────│
│                             │
│ ┌──────┐┌──────┐┌──────┐   │
│ │Daily ││Weekly││Month.│   │ ← Period filter
│ └──────┘└──────┘└──────┘   │
│                             │
│ 📊 Overall (Monthly)        │
│ ┌───────────────────────┐   │
│ │ ₹8,200 / ₹20,000     │   │
│ │ ████████░░░░░░ 41%    │   │ ← Green bar
│ │ ₹11,800 remaining     │   │
│ └───────────────────────┘   │
│                             │
│ 🍕 Food & Dining (Monthly)  │
│ ┌───────────────────────┐   │
│ │ ₹4,100 / ₹5,000      │   │
│ │ ████████████░░ 82%    │   │ ← Yellow bar (≥80%)
│ │ ⚠️ ₹900 remaining     │   │
│ └───────────────────────┘   │
│                             │
│ 🛍️ Shopping (Monthly)       │
│ ┌───────────────────────┐   │
│ │ ₹3,200 / ₹3,000      │   │
│ │ ████████████████ 107% │   │ ← Red bar (≥100%)
│ │ 🚨 ₹200 over budget   │   │
│ └───────────────────────┘   │
│                             │
│ 🚗 Transport (Weekly)       │
│ ┌───────────────────────┐   │
│ │ ₹350 / ₹1,000        │   │
│ │ ████░░░░░░░░░░ 35%    │   │ ← Green bar
│ │ ₹650 remaining        │   │
│ └───────────────────────┘   │
│                             │
│─────────────────────────────│
│ 🏠    📋    ➕    📊    ⚙️   │
└─────────────────────────────┘
```

### 11.2 Create Budget Flow

```
Tap "+ New" button
    │
    ▼
Budget creation modal opens
    │
    ▼
Step 1: Pick Category
┌───────────────────────┐
│ Select category:      │
│ ○ Overall (all)       │
│ ○ 🍕 Food & Dining    │
│ ○ 🛍️ Shopping         │
│ ○ 🚗 Transport         │
│ ...                   │
└───────────────────────┘
    │
    ▼
Step 2: Pick Period
┌──────┐┌──────┐┌──────┐
│Daily ││Weekly││Month.│
└──────┘└──────┘└──────┘
    │
    ▼
Step 3: Enter Amount
┌───────────────────────┐
│ ₹ 5,000               │
└───────────────────────┘
    │
    ▼
Tap "Create Budget"
    │
    ▼
POST /api/budgets { category_id, period, amount }
    │
    ├── 201 Created → Toast: "Budget created: 🍕 Food ₹5,000/month"
    │                  Budget card appears in list
    │
    └── 409 Conflict (already exists) → Toast: "Budget already exists for this category + period"
```

### 11.3 Edit / Delete Budget

```
Long press or swipe left on budget card
    │
    ├── "Edit" → Opens same modal with pre-filled values
    │              Change amount → Tap "Save" → PATCH /api/budgets/:id
    │
    └── "Delete" → Confirmation: "Delete this budget?"
                    [Cancel] [Delete]
                    → DELETE /api/budgets/:id
                    → Toast: "Budget deleted"
```

### 11.4 Budget Alert Flow

```
New transaction arrives → Budget check runs
    │
    ├── Spend < 80% → No alert
    │
    ├── Spend ≥ 80% AND < 100%
    │       │
    │       ▼
    │   Create budget_alert (threshold = 80)
    │       │
    │       ▼
    │   Dashboard: Yellow banner appears at top
    │   "⚠️ Food & Dining at 82% of monthly budget (₹900 remaining)"
    │       │
    │       ▼
    │   Notification Center: Yellow alert card added
    │       │
    │       ▼
    │   Bell icon badge count increments
    │
    └── Spend ≥ 100%
            │
            ▼
        Create budget_alert (threshold = 100)
            │
            ▼
        Dashboard: Red banner appears at top
        "🚨 Shopping OVER monthly budget by ₹200!"
            │
            ▼
        Notification Center: Red alert card added
            │
            ▼
        PWA push notification (if permission granted):
        "🚨 VAULT: Shopping budget exceeded by ₹200"
```

---

## 12. Flow 11 — PDF Upload & Import

### 12.1 PDF Upload Modal

> **Triggered by:** Tapping "📄 Upload Statement" button on Dashboard.

```
┌─────────────────────────────┐
│ Upload Statement      ✕     │
│─────────────────────────────│
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │    📄 Drop PDF here   │  │ ← Drag & drop zone (desktop)
│  │    or tap to browse   │  │ ← File picker (mobile)
│  │                       │  │
│  │   Canara Bank PDF     │  │
│  │   statement only      │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  PDF Password (if any):     │
│  ┌───────────────────────┐  │
│  │ Optional password     │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │     Upload & Parse    │  │
│  └───────────────────────┘  │
│                             │
│  ── Past Imports ──         │
│  ┌───────────────────────┐  │
│  │ Jul 2026.pdf  ✅ 45txn│  │
│  │ Jun 2026.pdf  ✅ 38txn│  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

### 12.2 Upload & Parse Flow

```
User selects PDF file (or drags onto drop zone)
    │
    ▼
File validation:
  - Is it .pdf? → If NO: "Only PDF files are supported"
  - Size ≤ 10MB? → If NO: "File too large (max 10MB)"
    │
    ▼
User enters password (optional) + taps "Upload & Parse"
    │
    ▼
Show progress:
  "Uploading..."    ████░░░░░░ 40%
  "Parsing..."      ████████░░ 80%
  "Deduplicating..." ██████████ 100%
    │
    ▼
POST /api/pdf/upload (multipart/form-data)
    │
    ├── Success (200) → Show Preview Screen ↓
    │
    ├── Wrong password (422) → "Incorrect PDF password. Try again."
    │
    └── Parse failed (500) → "Failed to parse PDF. Is this a Canara Bank statement?"
                              [Try Again] [Cancel]
```

### 12.3 Preview Before Import

```
┌─────────────────────────────┐
│ Import Preview        ✕     │
│─────────────────────────────│
│                             │
│  Found 45 transactions      │
│  ✅ 12 new                  │ ← Green
│  ⚠️ 33 duplicates (skip)   │ ← Gray
│  ❓ 0 flagged               │ ← Yellow
│                             │
│  ── New Transactions ──     │
│  ┌───────────────────────┐  │
│  │ ☑️ Jul 15 Swiggy -₹280│  │ ← Checkbox (select/deselect)
│  │ ☑️ Jul 18 Amazon -₹1.2k│ │
│  │ ☑️ Jul 20 ATM   -₹2000│  │
│  │ ...                   │  │
│  └───────────────────────┘  │
│                             │
│  ── Duplicates (skipped) ── │
│  ┌───────────────────────┐  │
│  │ ░░ Jul 10 Zomato -₹100│  │ ← Grayed out
│  │ ░░ Jul 12 GPay   +₹500│  │
│  │ ...                   │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  Import 12 Transactions│ │
│  └───────────────────────┘  │
│                             │
│  [Select All] [Deselect All]│
│                             │
└─────────────────────────────┘
```

### 12.4 Import Confirmation Flow

```
User reviews preview
    │
    ├── Uncheck any transactions they don't want to import
    │
    ▼
Tap "Import 12 Transactions"
    │
    ▼
POST /api/pdf/confirm { import_id, selected_ids: [...] }
    │
    ▼
Transactions inserted into DB
    │
    ▼
Modal closes → Toast: "✅ 12 transactions imported from Jul 2026 statement"
    │
    ▼
Dashboard and charts update with new data
```

---

## 13. Flow 12 — Notifications Center

### 13.1 Notification Center (Slide-in Panel)

> **Triggered by:** Tapping 🔔 bell icon in dashboard header.

```
┌─────────────────────────────┐
│ Notifications    Mark all ✓ │ ← Slide in from right
│─────────────────────────────│
│                             │
│ ── Today ──                 │
│                             │
│ 🚨 Shopping OVER budget     │ ← Red card
│    Monthly budget exceeded  │
│    by ₹200. Tap to review.  │
│    2:35 PM                  │
│                             │
│ ⚠️ Food at 82% of budget   │ ← Yellow card
│    ₹900 remaining this      │
│    month. Tap to review.    │
│    2:35 PM                  │
│                             │
│ ✅ PDF Import complete       │ ← Green card
│    12 transactions imported  │
│    from Jul 2026 statement.  │
│    1:00 PM                  │
│                             │
│ ── Yesterday ──             │
│                             │
│ ❓ Flagged transaction       │ ← Yellow card
│    Couldn't parse SMS.      │
│    Tap to review.           │
│    6:45 PM                  │
│                             │
│ ── Older ──                 │
│                             │
│ 🔔 Monthly reminder         │ ← Blue card
│    Upload your Canara Bank  │
│    statement for July.      │
│    Aug 1, 9:00 AM           │
│                             │
└─────────────────────────────┘
```

### 13.2 Notification Types

| Type | Icon | Color | Trigger |
|---|---|---|---|
| Budget Warning (80%) | ⚠️ | Yellow | Budget check on transaction INSERT |
| Budget Exceeded (100%) | 🚨 | Red | Budget check on transaction INSERT |
| PDF Import Complete | ✅ | Green | PDF import finishes |
| Flagged Transaction | ❓ | Yellow | Groq parse fails or low confidence |
| Monthly Reminder | 🔔 | Blue | Cron: 1st of every month |
| System Alert | 🔧 | Gray | Backend errors, downtime |

### 13.3 Notification Actions

```
Tap a notification card
    │
    ├── Budget alert → Navigate to Budgets screen
    ├── PDF import → Navigate to Transactions (filtered by import date)
    ├── Flagged txn → Open Flagged Transaction Review modal
    └── Monthly reminder → Open PDF Upload modal

Tap "Mark all ✓" → All notifications marked as read, badge clears
Swipe left on card → Delete single notification
```

---

## 14. Flow 13 — Settings

### 14.1 Settings Screen (under "More" tab)

```
┌─────────────────────────────┐
│ Settings                    │
│─────────────────────────────│
│                             │
│ 👤 Profile                  │
│ ┌───────────────────────┐   │
│ │ Name: [Your Name]     │   │
│ │ Username: [vault_user] │  │
│ │ Change Password →     │   │
│ └───────────────────────┘   │
│                             │
│ 📱 iOS Shortcut Setup       │
│ ┌───────────────────────┐   │
│ │ Re-run setup wizard → │   │
│ │ Test connection →     │   │
│ │ View API key →        │   │
│ └───────────────────────┘   │
│                             │
│ 🗂️ Categories               │
│ ┌───────────────────────┐   │
│ │ Manage categories →   │   │
│ └───────────────────────┘   │
│                             │
│ ⚡ Quick Presets             │
│ ┌───────────────────────┐   │
│ │ Manage presets →      │   │
│ └───────────────────────┘   │
│                             │
│ 💰 Budgets                  │
│ ┌───────────────────────┐   │
│ │ Manage budgets →      │   │ ← Navigate to Budgets screen
│ └───────────────────────┘   │
│                             │
│ 📄 PDF Upload               │
│ ┌───────────────────────┐   │
│ │ Upload statement →    │   │ ← Opens PDF Upload modal
│ │ Import history →      │   │
│ └───────────────────────┘   │
│                             │
│ 📤 Export Data               │
│ ┌───────────────────────┐   │
│ │ Export as CSV →        │   │
│ │ Export as PDF →        │   │
│ │ Share via WhatsApp →  │   │
│ └───────────────────────┘   │
│                             │
│ 🎨 Appearance               │
│ ┌───────────────────────┐   │
│ │ Theme: [System ▼]     │   │ ← System / Light / Dark
│ └───────────────────────┘   │
│                             │
│ ❓ Flagged Transactions      │
│ ┌───────────────────────┐   │
│ │ Review 2 flagged →    │   │ ← Badge shows count
│ └───────────────────────┘   │
│                             │
│ ℹ️ About                    │
│ ┌───────────────────────┐   │
│ │ Version 1.0.0         │   │
│ │ Build: Aug 2026       │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │     🚪 Log Out        │   │ ← Red text
│ └───────────────────────┘   │
│                             │
│─────────────────────────────│
│ 🏠    📋    ➕    📊    ⚙️   │
└─────────────────────────────┘
```

### 14.2 Category Management Screen

```
┌─────────────────────────────┐
│ ← Categories        + Add  │
│─────────────────────────────│
│                             │
│ ── Default ──               │
│ ┌───────────────────────┐   │
│ │ 🍕 Food & Dining   ✏️ │   │ ← Tap ✏️ to edit name/emoji/color
│ │ 🚗 Transport        ✏️ │   │
│ │ 🛍️ Shopping         ✏️ │   │
│ │ 💡 Bills & Utilities ✏️│   │
│ │ 🎬 Entertainment    ✏️ │   │
│ │ ...                    │   │
│ └───────────────────────┘   │
│                             │
│ ── Custom ──                │
│ ┌───────────────────────┐   │
│ │ 🐕 Pets              🗑️│  │ ← Custom categories can be deleted
│ │ 🏠 Rent              🗑️│  │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### 14.3 Logout Flow

```
Tap "Log Out"
    │
    ▼
Confirmation: "Are you sure you want to log out?"
[Cancel] [Log Out]
    │
    ├── Cancel → Stay on Settings
    │
    └── Log Out → Clear JWT cookie
                   Clear local cache
                   Navigate to Login page
                   Toast: "Logged out successfully"
```

---

## 15. Flow 14 — Export & Share

### 15.1 Export Options Modal

> **Triggered by:** Settings → Export Data → any export option.

```
┌─────────────────────────────┐
│ Export Data            ✕    │
│─────────────────────────────│
│                             │
│ Date Range:                 │
│ ┌───────────┐ ┌───────────┐│
│ │ Jul 1, 26 │→│ Aug 3, 26 ││
│ └───────────┘ └───────────┘│
│                             │
│ Filter by:                  │
│ Category: [All ▼]           │
│ Mode:     [All ▼]           │
│                             │
│ Format:                     │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ CSV  │ │ PDF  │ │ 📱WA │ │
│ └──────┘ └──────┘ └──────┘ │
│                             │
│ ┌───────────────────────┐   │
│ │     📥 Download       │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### 15.2 Export Flow

```
User selects date range + filters + format
    │
    ▼
Tap "Download"
    │
    ├── CSV → GET /api/export?format=csv&...
    │         → Browser downloads .csv file
    │         → Toast: "CSV exported (47 transactions)"
    │
    ├── PDF → GET /api/export?format=pdf&...
    │         → Browser downloads .pdf file
    │         → Toast: "PDF report exported"
    │
    └── WhatsApp → GET /api/export?format=whatsapp&...
                   → Returns pre-formatted text
                   → Opens native share sheet → WhatsApp
                   → Text:
                     "📊 VAULT — Jul-Aug 2026
                      💸 Spent: ₹15,420
                      💰 Received: ₹50,000
                      🍕 Food: ₹4,500
                      🛍️ Shopping: ₹3,200
                      ..."
```

---

## 16. Flow 15 — Flagged Transactions Review

### 16.1 Flagged Transaction Review Modal

> **Triggered by:** Notification center → flagged notification, or Settings → Flagged Transactions.

```
┌─────────────────────────────┐
│ Review Transaction    ✕     │
│─────────────────────────────│
│                             │
│ ⚠️ AI couldn't fully parse  │
│    this transaction.        │
│                             │
│ Raw SMS:                    │
│ ┌───────────────────────┐   │
│ │ "A/c XXX430 linked to │   │
│ │  card debited INR      │   │
│ │  130.00 on 02/08/26    │   │
│ │  POS txn..."           │   │
│ └───────────────────────┘   │
│                             │
│ AI's Best Guess:            │
│                             │
│ Amount:  ₹130.00 ✅         │ ← Green = confident
│ Type:    Debit ✅            │
│ Mode:    Card (POS) ✅      │
│ Merchant: ??? ⚠️            │ ← Yellow = uncertain
│ Category: Other ⚠️          │
│                             │
│ Fix it:                     │
│ Merchant:                   │
│ ┌───────────────────────┐   │
│ │ e.g., Reliance Fresh  │   │ ← User types
│ └───────────────────────┘   │
│                             │
│ Category:                   │
│ ┌───────────────────────┐   │
│ │ Shopping           ▼  │   │ ← User picks
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │   Confirm & Save ✅   │   │
│ └───────────────────────┘   │
│                             │
│ [Skip] [Delete Transaction] │
│                             │
└─────────────────────────────┘
```

### 16.2 Review Flow

```
User sees raw SMS + AI guess
    │
    ▼
User fills in missing/uncertain fields
    │
    ▼
Tap "Confirm & Save"
    │
    ▼
PATCH /api/transactions/:id {
  merchant: "Reliance Fresh",
  category_id: "shopping-uuid",
  is_flagged: false
}
    │
    ▼
Merchant mapping created (Reliance Fresh → Shopping)
    │
    ▼
Toast: "Transaction saved. Future 'Reliance Fresh' → Shopping"
    │
    ▼
Next flagged transaction loads (or "All reviewed! 🎉")
```

---

## 17. Flow 16 — Offline Behavior

```
App detects no internet connection
    │
    ▼
┌──────────────────────────────────────────┐
│ Yellow banner appears at top of screen:   │
│ "📡 You're offline — limited features"   │
└──────────────────────────────────────────┘
    │
    ▼
What works offline:
  ✅ View cached dashboard (last session data)
  ✅ View cached transaction list
  ✅ Browse cached charts
  ✅ Manual entry (queued locally)
  ✅ Theme toggle
  ❌ Real-time updates (no WebSocket)
  ❌ Search (server-side)
  ❌ PDF upload
  ❌ Export

Manual entry offline:
    │
    ▼
User adds manual transaction
    │
    ▼
Saved to IndexedDB / localStorage with status = "pending_sync"
    │
    ▼
Transaction appears in local feed with ⏳ sync pending icon
    │
    ▼
Internet reconnects
    │
    ▼
┌──────────────────────────────────────────┐
│ Green banner: "📡 Back online — syncing" │
└──────────────────────────────────────────┘
    │
    ▼
All pending transactions POSTed to backend
    │
    ▼
⏳ icons disappear → normal ✅
Toast: "2 transactions synced"
Banner disappears
```

---

## 18. Flow 17 — Error States

### 18.1 Backend Down

```
Dashboard tries to load → API returns timeout/5xx
    │
    ▼
┌──────────────────────────────────────────┐
│ Red banner at top:                        │
│ "⚠️ Server unreachable. Showing cached   │
│  data. Retrying..."                      │
└──────────────────────────────────────────┘
    │
    ▼
Show cached dashboard data (if available)
    │
    ▼
Auto-retry every 30 seconds
    │
    ▼
When server responds → Banner changes to green: "✅ Reconnected"
    → Refresh all data
    → Banner auto-dismisses after 3 seconds
```

### 18.2 AI Parse Failure

```
SMS arrives → Groq returns error / unparseable
    │
    ▼
Transaction inserted with:
  is_flagged = true
  flag_reason = "parse_failed" or "low_confidence"
    │
    ▼
Dashboard shows transaction card with ⚠️ icon:
┌───────────────────────────────────┐
│ ⚠️ Couldn't parse     -₹???     │
│    Tap to review                  │
│    SMS • Aug 3 • 2:35 PM         │
└───────────────────────────────────┘
    │
    ▼
Tap → Opens Flagged Transaction Review modal
```

### 18.3 PDF Upload Failure

```
Upload fails (wrong format, corrupt file, server error)
    │
    ▼
┌──────────────────────────────────────┐
│ ❌ Upload Failed                      │
│                                      │
│ "Could not parse this PDF. Make sure │
│  it's a Canara Bank account          │
│  statement."                         │
│                                      │
│ [Try Again]  [Choose Different File] │
└──────────────────────────────────────┘
```

### 18.4 Login Failure

```
Wrong credentials → Red text below password field:
"Invalid username or password"

Server error → Red text:
"Server unreachable. Try again later."
[Retry]

Too many attempts (5+):
"Too many failed attempts. Try again in 5 minutes."
Login button disabled, countdown timer shown.
```

### 18.5 Network Timeout on Any Action

```
Any API call takes > 10 seconds
    │
    ▼
Toast: "Request timed out. Please try again."
Action button re-enables for retry.
```

---

## 19. Navigation Map (Complete)

```
┌─────────────────────────────────────────────────────────────────┐
│                      VAULT NAVIGATION MAP                       │
│                                                                 │
│  App Launch                                                     │
│  └── Splash → Login → Setup Wizard → Dashboard                 │
│                                                                 │
│  Bottom Nav (always visible):                                   │
│  ├── 🏠 Dashboard                                               │
│  │   ├── Period selector (Today/Week/Month/Custom)              │
│  │   ├── 🔔 Notification Center (slide-in)                      │
│  │   ├── Summary Cards                                          │
│  │   ├── Budget Alert Banner → Budgets                          │
│  │   ├── Charts (tap segment → Transactions filtered)           │
│  │   ├── Budget Bars → Budgets                                  │
│  │   ├── Upload Statement → PDF Upload modal                    │
│  │   ├── Transaction Feed → Transaction Detail modal            │
│  │   └── "View All" → Transactions tab                          │
│  │                                                              │
│  ├── 📋 Transactions                                            │
│  │   ├── Quick filters (All/Debit/Credit)                       │
│  │   ├── Search bar → full-screen search                        │
│  │   ├── Filter panel (date/mode/category/amount)               │
│  │   ├── Transaction cards → Transaction Detail modal           │
│  │   └── Infinite scroll (50 per page)                          │
│  │                                                              │
│  ├── ➕ Manual Entry (FAB, center)                               │
│  │   ├── Full form (amount/category/mode/merchant/date/note)    │
│  │   └── Quick Presets (one-tap entries)                         │
│  │                                                              │
│  ├── 📊 Analytics                                               │
│  │   ├── Period selector (Week/Month/Year)                      │
│  │   ├── Spending trend line chart                              │
│  │   ├── Category donut → Transactions filtered                 │
│  │   ├── Payment mode stacked bar                               │
│  │   ├── Debit vs Credit comparison                             │
│  │   └── Top Merchants → Transactions filtered                  │
│  │                                                              │
│  └── ⚙️ More (Settings)                                         │
│      ├── Profile (name, username, change password)              │
│      ├── iOS Shortcut Setup (wizard, test, API key)             │
│      ├── Categories → Category management                       │
│      ├── Quick Presets → Preset management                      │
│      ├── Budgets → Budget management screen                     │
│      ├── PDF Upload → Upload modal + import history             │
│      ├── Export → CSV / PDF / WhatsApp                           │
│      ├── Appearance → Theme (System/Light/Dark)                 │
│      ├── Flagged Transactions → Review modal                    │
│      ├── About (version info)                                   │
│      └── Log Out                                                │
│                                                                 │
│  Overlays (accessible from multiple screens):                   │
│  ├── Transaction Detail modal (tap any transaction)             │
│  ├── Manual Entry modal (tap ➕ FAB)                             │
│  ├── PDF Upload modal (dashboard button / settings)             │
│  ├── Notification Center (🔔 bell icon)                         │
│  ├── Budget Create/Edit modal                                   │
│  ├── Category Create/Edit modal                                 │
│  ├── Flagged Review modal                                       │
│  └── Export Options modal                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

> **End of Document — VAULT App Flow v1.0**
