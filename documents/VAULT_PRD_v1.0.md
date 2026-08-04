# VAULT — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Approved Specification  
**Date:** August 2026  
**Target Release:** Q4 2026 — MVP  
**Classification:** Confidential  

---

## 1. Executive Summary

VAULT is a real-time personal expenditure tracking application built for the Indian banking ecosystem. It captures, categorises, and analyses every payment made via UPI, debit card, ATM, or bank transfer — giving users a live, unified view of their financial behaviour across all payment modes. The capture mechanism is Canara Bank SMS, automatically forwarded to the backend via an iOS Shortcuts automation on iOS 26.

The core problem VAULT solves: Indian consumers spread spending across multiple UPI apps (SuperMoney, Navi, GPay, PhonePe), debit cards, and cash, with no single place that shows everything together in real time, broken down by category and payment source.

> **Primary User (V1):** Single user, India-based, iPhone 14 Plus (iOS 26), Canara Bank account, primary UPI apps: SuperMoney, Navi, GPay, PhonePe. Payments in INR via UPI, debit card, and cash.

---

## 2. Problem Statement

### 2.1 User Pain Points

- Spending is fragmented across UPI apps, debit card, and cash — no single real-time view exists.
- UPI apps (SuperMoney, GPay, Navi, PhonePe) do NOT send push notifications for manually initiated payments on iPhone — only for autopay/mandate debits.
- No UPI app exports complete data — SuperMoney has no export at all.
- Manual tracking in spreadsheets is tedious and never maintained.
- Cash and card spends are completely invisible in UPI apps.
- No real-time budget awareness — overspending is discovered after the fact.

### 2.2 Root Cause

The Indian banking stack does not provide a consumer-facing real-time transaction API. Canara Bank has no Account Aggregator (AA) support, no open API, and no programmatic access to statements. UPI push notifications on iPhone only fire for autopay mandates — not for manually initiated payments. However, Canara Bank sends an SMS for every transaction across all payment modes (UPI, card, ATM, NEFT/IMPS). On iOS 26, an iOS Shortcuts automation can intercept this SMS silently and forward it to the backend — making bank SMS the single, reliable, real-time capture signal.

---

## 3. Goals & Non-Goals

### 3.1 Goals

- Capture all transactions in real time via iOS 26 Shortcuts automation triggered on Canara Bank SMS.
- Parse and categorise every transaction using AI (Groq API / Llama 3.1 70B).
- Attribute each transaction to the correct payment mode and merchant.
- Provide category-wise spending analysis with daily, weekly, and monthly views.
- Support budget setting and proactive alerts (push + in-app) across daily, weekly, and monthly periods.
- Work across all platforms — iPhone (Safari PWA), Windows browser, any modern web browser.
- Allow monthly Canara Bank PDF statement upload for full reconciliation.
- Enable export of reports as PDF, Excel/CSV, and WhatsApp share.
- Support future multi-user expansion with minimal rearchitecting.

### 3.2 Non-Goals (V1)

- No bank API integration — not available for Canara Bank.
- No investment or savings tracking in V1.
- No multi-language support in V1 (English only; regional languages post-launch).
- No Android support in V1 (iOS-first; Android in V2).
- No business expense tracking or GST categorisation in V1.
- No credit card tracking in V1 (debit card and UPI only).

---

## 4. User Personas

### 4.1 Primary Persona — V1

| Attribute | Detail |
|---|---|
| **Name** | Primary User |
| **Location** | Madurai, Tamil Nadu, India |
| **Device** | iPhone 14 Plus (iOS 26) |
| **Bank** | Canara Bank (savings account) |
| **Primary UPI App** | SuperMoney (Flipkart / @fkaxis) |
| **Secondary UPI Apps** | Navi (@hdfcbank), GPay (@okicici / @oksbi), PhonePe (@ybl — occasional) |
| **Other Payment Modes** | Canara Bank debit card, cash (INR) |
| **Tech Comfort** | High — comfortable with app setup and automations |
| **Goal** | Know exactly where every rupee goes, in real time, broken down by category and payment source |

### 4.2 Future Persona — V2+ (Public Launch)

- Any Indian smartphone user with one or more UPI apps.
- Small families wanting shared expense visibility.
- Freelancers and gig workers tracking business vs personal spend.

---

## 5. Data Capture Architecture

### 5.1 Real-Time Layer — iOS 26 SMS Automation (Canara Bank)

This is the primary real-time capture mechanism. Canara Bank sends an SMS for every transaction — UPI, debit card (POS), ATM cash withdrawal, NEFT, IMPS, and credits. On iOS 26, an iOS Shortcuts personal automation triggers silently the instant this SMS arrives, with no user interaction required.

> **Why bank SMS and not UPI push notifications?**  
> UPI apps (PhonePe, GPay, SuperMoney, Navi) do NOT fire push notifications for manually initiated payments on iPhone — only for autopay mandate debits. Bank SMS is the only unified, real-time signal that covers ALL payment modes in a single source.

> **How it works:**  
> Canara Bank SMS arrives → iOS 26 Shortcuts automation triggers automatically (Ask Before Running: OFF) → reads SMS body → POSTs to VAULT backend API → Groq AI parses amount, merchant, payment mode (UPI/Card/ATM/NEFT), debit/credit, and balance → dashboard updates in real time.

- Trigger: Message received containing "Canara" or "CANBNK"
- iOS 26 runs the shortcut silently — no banner, no tap, fully hands-free
- User sets up iOS Shortcut once — runs automatically forever after
- No OTP, PIN, or sensitive banking data is captured — SMS body text only
- Covers: UPI debits, UPI credits, POS card payments, ATM withdrawals, NEFT/IMPS in and out
- Expected coverage: ~95%+ of all account transactions

### 5.2 Reconciliation Layer — Canara Bank PDF Statement

- User downloads PDF statement from Canara netbanking (monthly, ~5 minutes).
- Uploads to VAULT — parsed automatically with deduplication logic.
- Catches any transactions missed by the SMS automation layer (e.g., SMS delivery failures).
- Deduplication logic prevents double-counting.
- Coverage: 100% of all account debits.

### 5.3 Manual Entry Layer — Cash & Edge Cases

- Quick-entry UI: amount + category + note — 3 taps maximum.
- For cash payments, petty expenses, or split bills.
- Quick Presets available (e.g., ☕ ₹10 Chai, 🚌 ₹20 Bus).

### 5.4 UPI Handle to App Mapping

| UPI Handle | App | Bank |
|---|---|---|
| `@fkaxis` | SuperMoney | Axis Bank (linked) |
| `@hdfcbank` | Navi | HDFC Bank (linked) |
| `@okicici / @oksbi` | Google Pay | ICICI / SBI (linked) |
| `@ybl` | PhonePe | Yes Bank (linked) |
| `Debit Card` | Physical card | Canara Bank |
| `Cash / ATM` | Manual / Statement | Canara Bank |

---

## 6. Feature Requirements

### 6.1 Core Features — MVP

#### F1 — Real-Time Transaction Capture via Bank SMS
- iOS Shortcut automation setup wizard — guided, one-time setup inside VAULT.
- Trigger: Message containing "Canara" or "CANBNK".
- iOS 26 automation runs fully automatically — Ask Before Running: OFF.
- SMS body POSTed to backend → Groq AI API parses it.
- Extracts: amount (INR), merchant/sender, payment mode (UPI/Card/ATM/NEFT), debit or credit, balance, timestamp.
- Transaction appears in dashboard within 3–5 seconds of SMS arrival.

#### F2 — Canara Bank PDF Statement Import
- Drag-and-drop or file picker upload on web; share sheet on iOS.
- AI-powered PDF parser handles Canara Bank statement format.
- Interactive import preview showing new vs duplicate transactions before confirming.
- Smart deduplication against existing transactions.

#### F3 — Category Engine
- Default categories: Food & Dining 🍕, Transport 🚗, Shopping 🛍️, Bills & Utilities 💡, Entertainment 🎬, Health 💊, Education 📚, Cash Withdrawal 🏧, Transfer 🏦, Other 📦.
- Custom categories: user can create, rename, set colour and emoji.
- AI auto-categorisation on every transaction — editable by user.
- Merchant memory: once user corrects a merchant category, future transactions for that merchant auto-categorise correctly.

#### F4 — Dashboard
- Summary view: total spend, total received, net balance, peak spend — for current day/week/month.
- Spending trend chart: bar graph by day or week within selected period.
- Category breakdown: donut chart with drill-down to transaction list.
- Payment mode split: UPI vs card vs cash — pie chart.
- Recent transactions feed: real-time, tap to edit category or add note.

#### F5 — Budget & Alerts
- Set budgets per category per period (daily / weekly / monthly — all three supported).
- Alert at 80% (Amber) and 100% (Red) of budget — push notification on iPhone + in-app banner.
- Overall budget limit with identical alert logic.
- Budget vs actual progress bar for each category on dashboard.

#### F6 — Manual Entry
- Floating action button (➕ FAB) on mobile — always accessible at center of navbar.
- Fields: type (expense/income), amount (required), category (required), payment mode, merchant name, date, note.
- Quick Presets for 1-tap cash entry.
- Visual ✋ icon in feed to distinguish manual entries from automated SMS capture.

#### F7 — Export & Share
- Export to PDF: full transaction list + charts for selected period.
- Export to Excel/CSV: raw transaction data with all fields.
- WhatsApp share: pre-formatted summary message with key stats for selected period.

### 6.2 Post-MVP Features — V2

- Android support with native SMS capture.
- Multi-user / family accounts with shared expense visibility.
- Email/OTP authentication option.
- Recurring transaction detection and subscription tracking.
- Spending insights and anomaly detection via AI.
- Regional language support (Tamil, Hindi).

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (PWA) | Single codebase for web + iOS home screen + Windows browser |
| **Mobile** | PWA via Safari (iOS) | No App Store needed; installable on iPhone home screen |
| **Backend API** | Node.js + Express | REST API; handles SMS ingestion, PDF parsing, exports |
| **AI Parser** | Groq API (Llama 3.1 70B) | Extracts structured data from raw SMS text and PDF (free tier, ultra-fast) |
| **Database** | Supabase (PostgreSQL) | Cloud sync, built-in auth, real-time subscriptions, free tier |
| **Auth** | Custom JWT + Supabase Auth | Username & Password login; Email/OTP in V2 |
| **Hosting — Backend** | Railway | Free tier, auto-deploy from GitHub |
| **Hosting — Frontend** | Vercel | Free tier, global CDN, Next.js native |
| **SMS Capture** | iOS 26 Shortcuts | Message automation on Canara Bank SMS; runs silently on iOS 26 |

### 7.2 Database Schema (Core Tables)

| Table | Key Fields |
|---|---|
| `users` | `id, username, password_hash, name, setup_complete, created_at` |
| `transactions` | `id, user_id, amount, merchant, category_id, upi_ref, payment_mode, type (debit/credit), source (sms/pdf/manual), raw_sms, balance_after, transaction_date, note, is_flagged, is_deleted` |
| `categories` | `id, user_id, name, colour, emoji, is_default, is_active` |
| `budgets` | `id, user_id, category_id, period (daily/weekly/monthly), amount, is_active` |
| `merchant_mappings` | `id, user_id, merchant_pattern, category_id` |
| `statement_imports` | `id, user_id, filename, imported_at, imported_count, duplicate_count, status` |

### 7.3 iOS 26 Shortcut SMS Capture Flow

- Trigger: "When I receive a message" (no sender filter, check body for "Canara" / "CANBNK").
- iOS 26 setting: Ask Before Running → OFF (runs fully silently).
- Action: Extract message body → Get ISO 8601 timestamp.
- Action: POST to `https://api.vaultapp.in/v1/sms` with payload: `{ raw_sms, timestamp }`.
- Backend: Validates API key, passes raw_sms to Groq AI API.
- Groq AI: Returns `{ amount, merchant, payment_mode, type (debit/credit), balance, category }`.
- Backend: Inserts structured transaction into Supabase PostgreSQL.
- Frontend: Supabase Realtime WebSocket fires → Dashboard updates live.

---

## 8. UX & Design Requirements

### 8.1 Visual Identity

- **Theme:** Dark Mode First (`#1A1A2E` background, `#16213E` glassmorphic cards, `#7C3AED` purple glow accents) with light mode toggle.
- **Typography:** **Plus Jakarta Sans** with `tabular-nums` formatting for aligned financial figures.
- **Financial Signals:** Soft Coral Red (`#EF4444`) for Debits, Vibrant Emerald (`#10B981`) for Credits.
- **Navigation:** Floating Frosted Glass Bottom Navigation Bar on mobile with elevated center ➕ FAB.

### 8.2 Platform Behaviour

- **iPhone:** PWA installed to home screen, full-screen, no browser chrome.
- **Windows Browser:** Full responsive layout with fixed sidebar navigation.
- **Minimum Supported:** iOS 26 for SMS automation; Chrome 110+, Edge 110+, Safari 16+.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Transaction capture latency** | < 5 seconds from Canara Bank SMS delivery to dashboard update |
| **PDF parse time** | < 10 seconds for a 3-month statement |
| **API uptime** | 99.5% monthly |
| **Dashboard load time** | < 2 seconds on 4G |
| **Data retention** | Unlimited for personal MVP; encrypted at rest (AES-256) |
| **Auth session** | JWT, 30-day refresh token, username & password login |
| **Offline support** | Manual entry works offline; syncs automatically on reconnect |

---

## 10. Monetisation — Freemium Model

| Feature | Free Tier | Premium Tier |
|---|---|---|
| **Transaction history** | 3 months | Unlimited |
| **Categories** | 10 default | Unlimited custom |
| **Budget periods** | Monthly only | Daily + Weekly + Monthly |
| **PDF statement imports** | 1 per month | Unlimited |
| **Export formats** | CSV only | PDF + CSV + WhatsApp |
| **AI insights** | Basic auto-category | Full spending insights + anomaly alerts |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **iOS Shortcut automation setup requires manual configuration** | High | High | Build an in-app guided setup wizard with step-by-step screenshots for iOS 26 |
| **Canara Bank changes SMS format or sender ID** | Low | High | Groq AI parser is prompt-based and adapts naturally to format changes |
| **Canara Bank SMS delivery failure (telecom network)** | Low | Medium | Monthly PDF reconciliation catches any missed transactions; deduplication logic prevents double counting |
| **Canara Bank PDF format changes** | Low | Medium | AI-based PDF parser adapts; fallback to manual column mapping UI |

---

## 12. Release Milestones

| Phase | Milestone | Target |
|---|---|---|
| **Phase 1 — Foundation** | Backend API + Supabase schema + Groq AI parser | Week 1–2 |
| **Phase 1 — Foundation** | iOS Shortcut capture flow end-to-end | Week 2–3 |
| **Phase 2 — Core UI** | Dashboard — summary + chart drill-down views | Week 3–5 |
| **Phase 2 — Core UI** | Manual entry + category management | Week 5–6 |
| **Phase 3 — Intelligence** | Budget engine + alerts (push + in-app) | Week 6–7 |
| **Phase 3 — Intelligence** | Canara Bank PDF import preview + deduplication | Week 7–8 |
| **Phase 4 — Polish** | Export (PDF, CSV, WhatsApp) + Dark/Light theme + PWA | Week 8–10 |
| **MVP Launch** | Private launch (single user) | Week 10 |

---

## 13. Success Metrics

- 100% of all bank transactions captured within 5 seconds of Canara Bank SMS arrival.
- Zero missed transactions after monthly PDF reconciliation.
- Dashboard load time consistently under 2 seconds.
- Manual category corrections drop below 10% after 30 days as merchant memory learns.

---

> **End of Document — VAULT PRD v1.0**
