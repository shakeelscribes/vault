# VAULT — Technical Requirements Document (TRD)

**Version:** 1.0  
**Status:** Draft  
**Date:** August 2026  
**Classification:** Confidential  
**Companion Document:** [VAULT PRD v1.0](file:///c:/Users/ahame/vault/docs/VAULT_PRD_v1.0.docx)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [API Specification](#7-api-specification)
8. [iOS Shortcut Specification](#8-ios-shortcut-specification)
9. [Groq AI Integration](#9-groq-ai-integration)
10. [Authentication & Security](#10-authentication--security)
11. [Real-Time WebSocket Protocol](#11-real-time-websocket-protocol)
12. [PDF Statement Parser](#12-pdf-statement-parser)
13. [Deduplication Engine](#13-deduplication-engine)
14. [Category Engine](#14-category-engine)
15. [Budget & Alert System](#15-budget--alert-system)
16. [Export Engine](#16-export-engine)
17. [Error Handling & Retry](#17-error-handling--retry)
18. [Monitoring & Health Checks](#18-monitoring--health-checks)
19. [Deployment Pipeline](#19-deployment-pipeline)
20. [Testing Strategy](#20-testing-strategy)
21. [Performance Requirements](#21-performance-requirements)
22. [Appendix](#appendix)

---

## 1. System Overview

### 1.1 What VAULT Does

VAULT is a real-time personal expenditure tracker that:

1. **Captures** every Canara Bank transaction SMS automatically via iOS 26 Shortcuts
2. **Parses** the raw SMS text using Groq AI (Llama 3.1 70B) to extract structured data
3. **Stores** transactions in a Supabase PostgreSQL database
4. **Displays** a real-time dashboard as a Progressive Web App (PWA)
5. **Reconciles** with monthly Canara Bank PDF statement uploads

### 1.2 Design Principles

| Principle | Implementation |
|---|---|
| **Single source of truth** | Canara Bank SMS covers ALL payment modes |
| **Zero manual effort** | iOS 26 shortcut runs silently, no taps |
| **AI-first parsing** | No brittle regex — Groq handles all SMS formats |
| **Real-time** | WebSocket pushes updates to dashboard instantly |
| **Offline-capable** | PWA caches dashboard, manual entry works offline |
| **Security-first** | Auth required, API key protected, encrypted at rest |

### 1.3 User Profile (V1)

- **Users:** 1 (single user, personal use)
- **Device:** iPhone 14 Plus, iOS 26
- **Bank:** Canara Bank (single savings account, Acct XXX430)
- **Payment Modes:** UPI, Debit Card (POS), ATM, NEFT, IMPS
- **Development OS:** Windows
- **Node.js:** v24.13.1

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        iPhone (iOS 26)                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │ Canara Bank   │───▶│ iOS Shortcuts Automation              │   │
│  │ SMS arrives   │    │                                      │   │
│  └──────────────┘    │ IF body contains "Canara" / "CANBNK" │   │
│                      │   → POST raw_sms to backend          │   │
│                      │ ELSE                                  │   │
│                      │   → Exit silently                     │   │
│                      └──────────────┬───────────────────────┘   │
│                                     │                           │
│  ┌──────────────────────────────────┼───────────────────────┐   │
│  │ Safari PWA (VAULT Dashboard)     │                       │   │
│  │ ◄── WebSocket ──────────────────┐│                       │   │
│  └─────────────────────────────────┘│                       │   │
└─────────────────────────────────────┼───────────────────────────┘
                                      │ HTTPS POST
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Railway / Render)                    │
│                    Node.js + Express                            │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ /api/sms   │  │ /api/txn   │  │ /api/pdf   │  │ /api/    │ │
│  │ SMS ingest │  │ CRUD ops   │  │ PDF upload │  │ export   │ │
│  └─────┬──────┘  └────────────┘  └─────┬──────┘  └──────────┘ │
│        │                               │                       │
│        ▼                               ▼                       │
│  ┌────────────────────────────────────────────┐                │
│  │         Groq AI Parser Service             │                │
│  │         Llama 3.1 70B                      │                │
│  │         Extracts structured JSON           │                │
│  └─────────────────┬──────────────────────────┘                │
│                    │                                            │
│                    ▼                                            │
│  ┌────────────────────────────────────────────┐                │
│  │         Supabase Client                     │                │
│  │         Insert / Query / Subscribe          │                │
│  └─────────────────┬──────────────────────────┘                │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (Cloud)                              │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────────┐   │
│  │ PostgreSQL │  │ Auth       │  │ Realtime (WebSocket)    │   │
│  │ Database   │  │ Email/OTP  │  │ Broadcasts on INSERT    │   │
│  └────────────┘  └────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                             │
│                    Next.js 14 PWA                               │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Dashboard  │  │ Txn List   │  │ Budgets    │  │ Settings │ │
│  │ Charts     │  │ Search     │  │ Alerts     │  │ PDF Up   │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Core Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| **Runtime** | Node.js | v24.13.1 | User's installed version |
| **Backend Framework** | Express.js | ^4.21.x | Lightweight, minimal overhead |
| **Frontend Framework** | Next.js | 14.x (App Router) | SSR + PWA + API routes + Vercel-native |
| **AI Parser** | Groq API | Llama 3.1 70B | Free tier (30 req/min), ultra-fast inference |
| **Database** | Supabase (PostgreSQL) | Free tier | Real-time subscriptions, built-in auth, cloud-hosted |
| **Auth** | Custom JWT + Supabase Auth | — | Username & Password login, bcrypt hashing, 30-day refresh tokens |
| **Real-time** | Supabase Realtime | — | WebSocket, auto-broadcasts on DB changes |
| **Hosting (Backend)** | Railway | Free tier | Auto-deploy from GitHub, Node.js native |
| **Hosting (Frontend)** | Vercel | Free tier | Global CDN, Next.js native, instant deploys |
| **SMS Capture** | iOS 26 Shortcuts | — | Message automation, runs without user tap |

### 3.2 NPM Dependencies — Backend

| Package | Purpose |
|---|---|
| `express` | HTTP server & routing |
| `cors` | Cross-origin requests (frontend ↔ backend) |
| `helmet` | Security headers |
| `express-rate-limit` | Rate limiting on SMS ingestion endpoint |
| `groq-sdk` | Official Groq AI client |
| `@supabase/supabase-js` | Supabase client (DB + Auth + Realtime) |
| `pdf-parse` | Parse Canara Bank PDF statements |
| `multer` | File upload handling (PDF) |
| `jsonwebtoken` | JWT verification for API auth |
| `bcryptjs` | Server-side password hashing |
| `dotenv` | Environment variable loading |
| `winston` | Structured logging |
| `node-cron` | Scheduled tasks (budget alerts, reminders) |
| `uuid` | Generate unique IDs |
| `zod` | Request body validation |

### 3.3 NPM Dependencies — Frontend

| Package | Purpose |
|---|---|
| `next` | Framework |
| `react`, `react-dom` | UI library |
| `@supabase/supabase-js` | Direct Supabase connection for Realtime |
| `@supabase/auth-helpers-nextjs` | Auth integration |
| `chart.js`, `react-chartjs-2` | Charts (donut, bar, line) |
| `date-fns` | Date formatting & manipulation |
| `react-hot-toast` | Toast notifications |
| `lucide-react` | Icons |
| `next-pwa` | PWA manifest & service worker |

---

## 4. Project Structure

```
vault/
├── documents/                    # Documentation
│   └── VAULT_TRD_v1.0.md        # This document
├── docs/                         # PRD
│   ├── prd.js
│   └── VAULT_PRD_v1.0.docx
│
├── backend/                      # Express API server
│   ├── package.json
│   ├── .env                      # Environment variables (NOT committed)
│   ├── .env.example              # Template with all required vars
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── config/
│   │   │   └── env.js            # Environment config loader
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification middleware
│   │   │   ├── apiKey.js         # API key validation (for SMS endpoint)
│   │   │   ├── rateLimiter.js    # Rate limiting config
│   │   │   └── errorHandler.js   # Global error handler
│   │   ├── routes/
│   │   │   ├── sms.js            # POST /api/sms — SMS ingestion
│   │   │   ├── transactions.js   # CRUD /api/transactions
│   │   │   ├── categories.js     # CRUD /api/categories
│   │   │   ├── budgets.js        # CRUD /api/budgets
│   │   │   ├── pdf.js            # POST /api/pdf — PDF upload & parse
│   │   │   ├── export.js         # GET /api/export — CSV/PDF export
│   │   │   ├── health.js         # GET /api/health — Health check
│   │   │   └── auth.js           # Auth routes (login, logout, session)
│   │   ├── services/
│   │   │   ├── groqParser.js     # Groq AI SMS/PDF parsing logic
│   │   │   ├── pdfParser.js      # Canara Bank PDF extraction
│   │   │   ├── deduplication.js  # Duplicate transaction detection
│   │   │   ├── categoryEngine.js # Auto-categorisation + merchant memory
│   │   │   ├── budgetEngine.js   # Budget calculation + alert triggers
│   │   │   └── exportEngine.js   # CSV/PDF report generation
│   │   ├── db/
│   │   │   └── supabase.js       # Supabase client initialisation
│   │   ├── utils/
│   │   │   ├── logger.js         # Winston logger config
│   │   │   ├── validators.js     # Zod schemas for request validation
│   │   │   └── constants.js      # Payment modes, categories, etc.
│   │   └── jobs/
│   │       ├── budgetAlerts.js   # Cron: check budgets, send alerts
│   │       └── statementReminder.js  # Cron: monthly PDF upload reminder
│   └── tests/
│       ├── sms.test.js
│       ├── groqParser.test.js
│       └── deduplication.test.js
│
├── frontend/                     # Next.js 14 PWA
│   ├── package.json
│   ├── next.config.js            # PWA config, environment vars
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   ├── icons/                # App icons (192x192, 512x512)
│   │   └── sw.js                 # Service worker (generated)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js         # Root layout (auth wrapper, theme)
│   │   │   ├── page.js           # Dashboard (main page)
│   │   │   ├── login/
│   │   │   │   └── page.js       # Login page (email/OTP)
│   │   │   ├── transactions/
│   │   │   │   └── page.js       # Full transaction list + search
│   │   │   ├── budgets/
│   │   │   │   └── page.js       # Budget management
│   │   │   ├── settings/
│   │   │   │   └── page.js       # Settings (categories, profile, export)
│   │   │   ├── upload/
│   │   │   │   └── page.js       # PDF statement upload
│   │   │   └── api/              # Next.js API routes (proxy to backend)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.js    # Desktop sidebar nav
│   │   │   │   ├── BottomNav.js  # Mobile bottom nav
│   │   │   │   ├── Header.js     # Top bar with user menu
│   │   │   │   └── ThemeToggle.js
│   │   │   ├── dashboard/
│   │   │   │   ├── SummaryCards.js    # Total spend, top category, etc.
│   │   │   │   ├── SpendingChart.js   # Bar chart (daily/weekly trend)
│   │   │   │   ├── CategoryDonut.js   # Category breakdown
│   │   │   │   ├── PaymentModePie.js  # UPI vs Card vs Cash
│   │   │   │   ├── TransactionFeed.js # Live feed of recent transactions
│   │   │   │   └── BudgetBars.js      # Budget vs actual per category
│   │   │   ├── transactions/
│   │   │   │   ├── TransactionList.js
│   │   │   │   ├── TransactionCard.js
│   │   │   │   ├── TransactionModal.js # Edit/detail view
│   │   │   │   ├── ManualEntryFAB.js   # Floating action button
│   │   │   │   └── SearchFilter.js
│   │   │   ├── budgets/
│   │   │   │   ├── BudgetForm.js
│   │   │   │   └── BudgetCard.js
│   │   │   └── common/
│   │   │       ├── Toast.js
│   │   │       ├── Modal.js
│   │   │       ├── Loader.js
│   │   │       └── EmptyState.js
│   │   ├── lib/
│   │   │   ├── supabase.js       # Supabase browser client
│   │   │   ├── supabaseServer.js # Supabase server client
│   │   │   └── api.js            # Backend API fetch helpers
│   │   ├── hooks/
│   │   │   ├── useRealtime.js    # Supabase Realtime subscription hook
│   │   │   ├── useAuth.js        # Auth state hook
│   │   │   └── useTheme.js       # Dark/light mode hook
│   │   └── styles/
│   │       └── globals.css       # Design system tokens + global styles
│   └── tests/
│       └── dashboard.test.js
│
└── .github/
    └── workflows/
        ├── deploy-backend.yml    # CI/CD for backend → Railway
        └── deploy-frontend.yml   # CI/CD for frontend → Vercel
```

---

## 5. Environment Variables

### 5.1 Backend `.env`

```env
# ── Server ──
PORT=3001
NODE_ENV=production

# ── Supabase ──
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # Server-side only, never expose

# ── Groq ──
GROQ_API_KEY=gsk_xxxxxxxxxxxx
GROQ_MODEL=llama-3.1-70b-versatile

# ── API Security ──
VAULT_API_KEY=vault_sk_xxxxxxxxxxxxxxxx   # iOS Shortcut sends this in header
JWT_SECRET=your-jwt-secret-min-32-chars

# ── Monitoring ──
ALERT_EMAIL=your-email@example.com

# ── Rate Limits ──
SMS_RATE_LIMIT_WINDOW_MS=60000            # 1 minute
SMS_RATE_LIMIT_MAX=30                     # Max 30 SMS per minute
```

### 5.2 Frontend `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_BACKEND_URL=https://vault-backend.up.railway.app
```

---

## 6. Database Schema

### 6.1 Overview

All tables live in Supabase PostgreSQL. Row Level Security (RLS) is enabled on all tables.

### 6.2 Tables

#### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Supabase Auth user ID / User ID |
| `username` | `TEXT` | NOT NULL, UNIQUE | User login name |
| `password_hash` | `TEXT` | NOT NULL | Hashed password (bcrypt, 10 salt rounds) |
| `name` | `TEXT` | | Display name |
| `setup_complete` | `BOOLEAN` | DEFAULT false | Whether user completed onboarding wizard |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Account creation time |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | Last profile update |

#### `transactions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Transaction ID |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `amount` | `DECIMAL(12,2)` | NOT NULL | Transaction amount in INR |
| `type` | `TEXT` | NOT NULL, CHECK IN ('debit', 'credit') | Debit or Credit |
| `payment_mode` | `TEXT` | NOT NULL, CHECK IN ('upi', 'card_pos', 'atm', 'neft', 'imps', 'rtgs', 'cash', 'other') | Payment mode |
| `merchant` | `TEXT` | | Merchant / sender / receiver name |
| `category_id` | `UUID` | FK → categories.id | Assigned category |
| `upi_ref` | `TEXT` | | UPI reference number (if UPI) |
| `balance_after` | `DECIMAL(12,2)` | | Account balance after transaction |
| `source` | `TEXT` | NOT NULL, CHECK IN ('sms', 'pdf', 'manual') | How this transaction was captured |
| `raw_sms` | `TEXT` | | Original SMS text (if source = sms) |
| `transaction_date` | `DATE` | NOT NULL | Date of transaction |
| `note` | `TEXT` | | User-added note |
| `is_flagged` | `BOOLEAN` | DEFAULT false | Flagged for manual review |
| `flag_reason` | `TEXT` | | Why it was flagged |
| `is_deleted` | `BOOLEAN` | DEFAULT false | Soft delete |
| `groq_confidence` | `DECIMAL(3,2)` | | AI parsing confidence score (0.00–1.00) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | Last edit time |

**Indexes:**
- `idx_transactions_user_date` on `(user_id, transaction_date DESC)`
- `idx_transactions_user_mode` on `(user_id, payment_mode)`
- `idx_transactions_user_category` on `(user_id, category_id)`
- `idx_transactions_dedup` on `(user_id, amount, transaction_date, merchant)` — for deduplication

#### `categories`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Category ID |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `name` | `TEXT` | NOT NULL | Category name |
| `emoji` | `TEXT` | | Display emoji |
| `color` | `TEXT` | | Hex colour code |
| `is_default` | `BOOLEAN` | DEFAULT false | System default category |
| `is_active` | `BOOLEAN` | DEFAULT true | Soft delete |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Default categories (seeded on user creation):**

| Name | Emoji | Color |
|---|---|---|
| Food & Dining | 🍕 | #EF4444 |
| Transport | 🚗 | #3B82F6 |
| Shopping | 🛍️ | #8B5CF6 |
| Bills & Utilities | 💡 | #F59E0B |
| Entertainment | 🎬 | #EC4899 |
| Health | 💊 | #10B981 |
| Education | 📚 | #6366F1 |
| Cash Withdrawal | 🏧 | #6B7280 |
| Transfer | 🏦 | #14B8A6 |
| Other | 📦 | #9CA3AF |

#### `merchant_mappings`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `merchant_pattern` | `TEXT` | NOT NULL | Merchant name pattern (case-insensitive) |
| `category_id` | `UUID` | FK → categories.id, NOT NULL | Mapped category |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Purpose:** When user corrects "Zomato" from "Other" to "Food & Dining", future Zomato transactions auto-categorise correctly. Merchant memory.

**Unique constraint:** `(user_id, merchant_pattern)` — one mapping per merchant per user.

#### `budgets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `category_id` | `UUID` | FK → categories.id | NULL = overall budget |
| `period` | `TEXT` | NOT NULL, CHECK IN ('daily', 'weekly', 'monthly') | Budget period |
| `amount` | `DECIMAL(12,2)` | NOT NULL | Budget limit in INR |
| `is_active` | `BOOLEAN` | DEFAULT true | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Unique constraint:** `(user_id, category_id, period)` — one budget per category per period.

#### `budget_alerts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | |
| `budget_id` | `UUID` | FK → budgets.id, NOT NULL | Which budget triggered |
| `threshold` | `INTEGER` | NOT NULL | 80 or 100 (percent) |
| `actual_amount` | `DECIMAL(12,2)` | NOT NULL | Spent amount at time of alert |
| `triggered_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `is_read` | `BOOLEAN` | DEFAULT false | User acknowledged |

#### `statement_imports`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | |
| `filename` | `TEXT` | NOT NULL | Original file name |
| `file_size_bytes` | `INTEGER` | | File size |
| `status` | `TEXT` | CHECK IN ('processing', 'completed', 'failed') | |
| `total_rows` | `INTEGER` | | Total transactions in PDF |
| `imported_count` | `INTEGER` | | New transactions inserted |
| `duplicate_count` | `INTEGER` | | Duplicates skipped |
| `error_message` | `TEXT` | | If status = failed |
| `imported_at` | `TIMESTAMPTZ` | DEFAULT now() | |

#### `audit_log`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | |
| `entity_type` | `TEXT` | NOT NULL | 'transaction', 'category', 'budget' |
| `entity_id` | `UUID` | NOT NULL | ID of the modified record |
| `action` | `TEXT` | NOT NULL | 'create', 'update', 'delete' |
| `old_values` | `JSONB` | | Previous field values |
| `new_values` | `JSONB` | | Updated field values |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

### 6.3 Row Level Security (RLS) Policies

All tables enforce:
```sql
-- Users can only read/write their own data
CREATE POLICY "Users own data" ON transactions
  FOR ALL USING (auth.uid() = user_id);
```

Applied identically to: `transactions`, `categories`, `merchant_mappings`, `budgets`, `budget_alerts`, `statement_imports`, `audit_log`.

### 6.4 Database Functions

#### `fn_update_timestamp()`
Trigger function — auto-updates `updated_at` on row modification.
Applied to: `users`, `transactions`.

#### `fn_check_budget_on_insert()`
Trigger on `transactions` INSERT — calculates current spend for the transaction's category and period, fires budget alert if ≥ 80% or ≥ 100%.

---

## 7. API Specification

### 7.1 Base URL

```
Production:  https://vault-backend.up.railway.app/api
Development: http://localhost:3001/api
```

### 7.2 Authentication

All endpoints (except `/api/health` and `/api/sms`) require a Bearer JWT token in the `Authorization` header:
```
Authorization: Bearer <supabase-jwt-token>
```

The `/api/sms` endpoint uses a custom API key:
```
X-Vault-API-Key: vault_sk_xxxxxxxxxxxxxxxx
```

### 7.3 Endpoints

---

#### `POST /api/sms` — SMS Ingestion (from iOS Shortcut)

**Auth:** API Key (`X-Vault-API-Key` header)  
**Rate Limit:** 30 requests per minute  

**Request Body:**
```json
{
  "raw_sms": "Dear Customer, Acct XXX430 Dr. INR 100.00 on 03/08/26 to zomato; UPI: 657803288445; Bal INR 984.03-Canara Bank",
  "timestamp": "2026-08-03T13:35:00Z"
}
```

**Validation (Zod):**
```javascript
{
  raw_sms: z.string().min(10).max(500),
  timestamp: z.string().datetime()
}
```

**Processing Pipeline:**
1. Validate API key
2. Validate request body (Zod)
3. **Pre-filter:** Check if SMS contains banking keywords (`INR`, `Acct`, `Bal`, `Dr.`, `Cr.`)
   - If NO → return `200 { status: "ignored", reason: "non-transactional" }`
4. **OTP filter:** Check if SMS contains `OTP` or `one-time password`
   - If YES → return `200 { status: "ignored", reason: "otp" }`
5. Send to Groq AI parser
6. If Groq confidence < 0.7 → flag for manual review (`is_flagged = true`)
7. Check merchant memory (merchant_mappings) for category override
8. Insert into `transactions` table
9. Check budget thresholds
10. Return structured response

**Success Response (201):**
```json
{
  "status": "created",
  "transaction": {
    "id": "uuid",
    "amount": 100.00,
    "type": "debit",
    "payment_mode": "upi",
    "merchant": "Zomato",
    "category": "Food & Dining",
    "balance_after": 984.03,
    "transaction_date": "2026-08-03",
    "groq_confidence": 0.95,
    "is_flagged": false
  }
}
```

**Error Responses:**
- `401` — Invalid API key
- `422` — Validation error (bad SMS format)
- `429` — Rate limit exceeded
- `500` — Internal server error (Groq failure, DB failure)

---

#### `GET /api/transactions` — List Transactions

**Auth:** Bearer JWT  
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 50 | Max items (1–200) |
| `offset` | integer | 0 | Pagination offset |
| `start_date` | date | — | Filter from date (YYYY-MM-DD) |
| `end_date` | date | — | Filter to date |
| `payment_mode` | string | — | Filter by mode |
| `category_id` | uuid | — | Filter by category |
| `type` | string | — | 'debit' or 'credit' |
| `is_flagged` | boolean | — | Show only flagged |
| `search` | string | — | Search merchant name |

**Response (200):**
```json
{
  "transactions": [ ... ],
  "total": 1234,
  "limit": 50,
  "offset": 0
}
```

---

#### `GET /api/transactions/:id` — Get Single Transaction

**Auth:** Bearer JWT  

**Response (200):** Full transaction object.

---

#### `PATCH /api/transactions/:id` — Update Transaction

**Auth:** Bearer JWT  

**Editable Fields:**
```json
{
  "category_id": "uuid",
  "merchant": "string",
  "note": "string",
  "is_flagged": false,
  "payment_mode": "string"
}
```

**Side Effects:**
- If `category_id` is changed → create/update `merchant_mappings` for this merchant (merchant memory)
- Creates `audit_log` entry with old and new values

---

#### `DELETE /api/transactions/:id` — Soft Delete Transaction

**Auth:** Bearer JWT  
Sets `is_deleted = true`. Creates audit log entry.

---

#### `POST /api/transactions/manual` — Manual Entry

**Auth:** Bearer JWT  

**Request Body:**
```json
{
  "amount": 50.00,
  "type": "debit",
  "payment_mode": "cash",
  "merchant": "Tea stall",
  "category_id": "uuid",
  "transaction_date": "2026-08-03",
  "note": "Morning chai"
}
```

---

#### `POST /api/pdf/upload` — Upload Canara Bank PDF Statement

**Auth:** Bearer JWT  
**Content-Type:** `multipart/form-data`  
**Max File Size:** 10 MB  
**Accepted:** `.pdf`  

**Request:**
```
file: <PDF file>
password: <optional PDF password>
```

**Processing Pipeline:**
1. Upload and validate file (PDF, ≤10MB)
2. Extract text from PDF (handle password-protected)
3. Parse each transaction row via Groq AI
4. Run deduplication against existing transactions
5. Insert new transactions (source = 'pdf')
6. Create `statement_imports` record

**Response (200):**
```json
{
  "status": "completed",
  "import_id": "uuid",
  "total_rows": 45,
  "imported": 12,
  "duplicates": 33,
  "flagged": 0
}
```

---

#### `GET /api/dashboard/summary` — Dashboard Summary

**Auth:** Bearer JWT  
**Query:** `period=daily|weekly|monthly`, `date=YYYY-MM-DD`

**Response (200):**
```json
{
  "total_debit": 15420.00,
  "total_credit": 50000.00,
  "net": 34580.00,
  "transaction_count": 47,
  "top_category": { "name": "Food & Dining", "amount": 4500.00 },
  "biggest_payment": { "merchant": "Amazon", "amount": 3200.00 },
  "by_category": [ ... ],
  "by_payment_mode": [ ... ],
  "daily_trend": [ ... ]
}
```

---

#### `CRUD /api/categories` — Category Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create custom category |
| `PATCH` | `/api/categories/:id` | Update name/emoji/color |
| `DELETE` | `/api/categories/:id` | Soft delete (set inactive) |

---

#### `CRUD /api/budgets` — Budget Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/budgets` | List all budgets with current spend |
| `POST` | `/api/budgets` | Create budget (category + period + amount) |
| `PATCH` | `/api/budgets/:id` | Update amount |
| `DELETE` | `/api/budgets/:id` | Delete budget |

---

#### `GET /api/export` — Export Data

**Auth:** Bearer JWT  
**Query:** `format=csv|pdf`, `start_date`, `end_date`, `category_id`, `payment_mode`

**Response:**
- CSV: Returns `.csv` file download
- PDF: Returns `.pdf` file download

---

#### `GET /api/health` — Health Check

**Auth:** None  

**Response (200):**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0",
  "database": "connected",
  "groq": "reachable",
  "timestamp": "2026-08-03T13:35:00Z"
}
```

---

## 8. iOS Shortcut Specification

### 8.1 Automation Setup

| Setting | Value |
|---|---|
| **Type** | Personal Automation |
| **Trigger** | "When I receive a message" |
| **Sender Filter** | None (trigger on ALL messages) |
| **Ask Before Running** | OFF (iOS 26) |
| **Notify When Run** | OFF |

### 8.2 Shortcut Logic (Step by Step)

```
1. TRIGGER: Message Received
   │
2. GET message content → store in variable "smsBody"
   │
3. IF smsBody CONTAINS "Canara" OR "CANBNK"
   │   ├── NO → EXIT (stop, do nothing)
   │   └── YES ↓
   │
4. GET Current Date → format as "yyyy-MM-dd'T'HH:mm:ssZ" → store as "ts"
   │
5. GET Contents of URL
   │   URL:    https://vault-backend.up.railway.app/api/sms
   │   Method: POST
   │   Headers:
   │     Content-Type: application/json
   │     X-Vault-API-Key: vault_sk_xxxxxxxxxxxxxxxx
   │   Request Body (JSON):
   │     {
   │       "raw_sms": [smsBody],
   │       "timestamp": [ts]
   │     }
   │
6. END
```

### 8.3 Setup Wizard (In-App)

The VAULT web app will include a guided setup page at `/settings/shortcut-setup` with:

1. Screenshot-by-screenshot instructions for iOS 26
2. Copy-paste button for the backend URL
3. Copy-paste button for the API key
4. A "Test Connection" button that sends a dummy SMS to verify the pipeline works
5. Troubleshooting FAQ

---

## 9. Groq AI Integration

### 9.1 Configuration

| Setting | Value |
|---|---|
| **Provider** | Groq Cloud |
| **Model** | `llama-3.1-70b-versatile` |
| **Temperature** | 0 (deterministic) |
| **Max Tokens** | 300 |
| **Free Tier Limit** | 30 requests/minute, 14,400 requests/day |
| **Retry on Failure** | 3 attempts with exponential backoff |

### 9.2 System Prompt — SMS Parsing

```
You are a banking SMS parser for Canara Bank (India). 
Extract transaction details from the SMS and return ONLY valid JSON.

Rules:
- "Dr." or "debited" = debit. "Cr." or "credited" = credit.
- If "UPI" appears in the SMS → payment_mode = "upi"
- If "NEFT" appears → payment_mode = "neft"
- If "IMPS" appears → payment_mode = "imps"
- If "RTGS" appears → payment_mode = "rtgs"
- If "POS" or "linked to card" appears → payment_mode = "card_pos"
- If "ATM" or "withdrawn" appears → payment_mode = "atm"
- Otherwise → payment_mode = "other"
- Extract the UPI reference number if present (digits after "UPI:" or "UPI/")
- Amounts are in INR. Remove commas. Parse as decimal.
- Dates may be DD/MM/YY or DD/MM/YYYY format. Return as YYYY-MM-DD.
- Auto-categorise: Zomato/Swiggy → "Food & Dining", Amazon/Flipkart → "Shopping", etc.
- confidence: your confidence in the parsing (0.0 to 1.0)

Return this exact JSON structure:
{
  "amount": <number>,
  "type": "<debit|credit>",
  "payment_mode": "<upi|card_pos|atm|neft|imps|rtgs|other>",
  "merchant": "<string or null>",
  "upi_ref": "<string or null>",
  "balance_after": <number or null>,
  "transaction_date": "<YYYY-MM-DD>",
  "category": "<string>",
  "confidence": <number>
}

If you cannot parse the SMS, return:
{
  "error": "unparseable",
  "reason": "<brief reason>",
  "confidence": 0.0
}
```

### 9.3 Example Inputs & Outputs

**Input 1 — UPI Debit:**
```
Dear Customer, Acct XXX430 Dr. INR 100.00 on 31/07/26 to zomato; UPI: 657803288445; Bal INR 1,102.27-CanaraBank
```
**Output 1:**
```json
{
  "amount": 100.00,
  "type": "debit",
  "payment_mode": "upi",
  "merchant": "Zomato",
  "upi_ref": "657803288445",
  "balance_after": 1102.27,
  "transaction_date": "2026-07-31",
  "category": "Food & Dining",
  "confidence": 0.97
}
```

**Input 2 — Card POS Debit:**
```
A/c XXX430 linked to card debited INR 130.00 on 02/08/26 POS txn. Avl Bal INR 1,833.27. To stop further debit SMS SUSPECT to 56161, Dial 1930 for cyber fraud. -Canara Bank
```
**Output 2:**
```json
{
  "amount": 130.00,
  "type": "debit",
  "payment_mode": "card_pos",
  "merchant": null,
  "upi_ref": null,
  "balance_after": 1833.27,
  "transaction_date": "2026-08-02",
  "category": "Other",
  "confidence": 0.90
}
```

**Input 3 — NEFT Credit:**
```
An amount of INR 409.36 has been credited to XXX430 on 03/08/2026 towards NEFT by Sender ETERNAL LIMITED, IFSC CITI0000002, Sender A/c XXXX2078, CITI BANK, NEW DELHI, UTR CITIN26710133301, Total Avail. Bal INR 984.03- Canara Bank
```
**Output 3:**
```json
{
  "amount": 409.36,
  "type": "credit",
  "payment_mode": "neft",
  "merchant": "ETERNAL LIMITED",
  "upi_ref": null,
  "balance_after": 984.03,
  "transaction_date": "2026-08-03",
  "category": "Transfer",
  "confidence": 0.95
}
```

**Input 4 — UPI Credit:**
```
Dear Customer, Acct XXX430 credited with INR 464.00 on 31/07/26 from NARMILA; UPI:621268203904; Bal INR 1,667.27-CanaraBank
```
**Output 4:**
```json
{
  "amount": 464.00,
  "type": "credit",
  "payment_mode": "upi",
  "merchant": "NARMILA",
  "upi_ref": "621268203904",
  "balance_after": 1667.27,
  "transaction_date": "2026-07-31",
  "category": "Transfer",
  "confidence": 0.96
}
```

### 9.4 Error Handling

| Scenario | Action |
|---|---|
| Groq returns unparseable response | Flag transaction, store raw SMS, set `is_flagged = true` with reason |
| Groq API timeout (>10s) | Retry up to 3 times with exponential backoff (1s, 2s, 4s) |
| Groq API rate limit (429) | Queue and retry after 60 seconds |
| Groq API down (5xx) | Store SMS in a pending queue; process when API recovers |
| Confidence < 0.7 | Insert transaction but set `is_flagged = true` for manual review |

---

## 10. Authentication & Security

### 10.1 Auth Flow

```
User opens VAULT → Redirected to /login
  → Enters Username & Password
  → POST /api/auth/login { username, password }
  → Backend verifies user & validates bcrypt password hash
  → Backend returns JWT + Refresh Token
  → JWT stored in httpOnly cookie
  → If setup_complete = false → Redirect to Setup Wizard
  → If setup_complete = true  → Redirect to Dashboard
```

### 10.2 Session Management

| Setting | Value |
|---|---|
| JWT expiry | 1 hour |
| Refresh token expiry | 30 days |
| Session storage | httpOnly, Secure, SameSite=Strict cookie |
| Auto-refresh | Frontend auto-refreshes JWT before expiry |
| Account Lockout | 5 failed attempts → 5 minute cooldown |

### 10.3 API Security Layers

| Layer | Protection |
|---|---|
| **HTTPS** | TLS 1.3 on all endpoints (Railway/Vercel enforce this) |
| **Helmet** | Security headers (X-Frame-Options, CSP, etc.) |
| **CORS** | Only allow requests from VAULT frontend domain |
| **Rate Limiting** | 30 req/min on `/api/sms`, 100 req/min on all other endpoints |
| **API Key** | `/api/sms` requires `X-Vault-API-Key` header |
| **JWT** | All other endpoints require valid Supabase JWT |
| **RLS** | Supabase Row Level Security — users can only access their own data |
| **Input Validation** | Zod schemas on every request body |
| **SQL Injection** | Supabase client uses parameterised queries |

### 10.4 Sensitive Data Handling

| Data | Handling |
|---|---|
| Raw SMS text | Stored encrypted at rest (Supabase AES-256) |
| API keys | `.env` only, never committed to git |
| Passwords | Hashed server-side using `bcrypt` (10 salt rounds); never stored in plain text |
| Session Tokens | httpOnly cookie, Secure, SameSite=Strict |
| Account number | Already masked in SMS (XXX430); never stored in full |

---

## 11. Real-Time WebSocket Protocol

### 11.1 How It Works

VAULT uses **Supabase Realtime** — the frontend subscribes to the `transactions` table. When the backend inserts a new transaction (from SMS or manual entry), Supabase automatically broadcasts the change to all connected clients via WebSocket.

### 11.2 Frontend Subscription

```javascript
// hooks/useRealtime.js
const channel = supabase
  .channel('transactions-realtime')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'transactions',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // New transaction received — add to state
      addTransaction(payload.new);
      showToast(`₹${payload.new.amount} ${payload.new.type} — ${payload.new.merchant}`);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'transactions',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Transaction updated — refresh in state
      updateTransaction(payload.new);
    }
  )
  .subscribe();
```

### 11.3 Toast Notification on New Transaction

When a new transaction arrives via WebSocket:
- **Desktop:** Toast notification in bottom-right corner
- **Mobile (PWA):** Toast notification at top of screen
- Shows: `₹100 debited — Zomato (Food & Dining)`
- Auto-dismisses after 5 seconds
- Tap to expand transaction detail

---

## 12. PDF Statement Parser

### 12.1 Supported Format

Canara Bank monthly account statement (PDF), including password-protected files.

### 12.2 Processing Pipeline

```
PDF Upload → Decrypt (if password) → Extract text → Split rows
  → For each row: Send to Groq → Get structured JSON
  → Deduplication check → Insert or skip
  → Return summary
```

### 12.3 Password Handling

```javascript
// services/pdfParser.js
const pdfParse = require('pdf-parse');

async function parsePDF(buffer, password = null) {
  const options = {};
  if (password) {
    options.password = password;
  }
  const data = await pdfParse(buffer, options);
  return data.text; // Full extracted text
}
```

### 12.4 Groq Prompt for PDF Row Parsing

```
You are parsing a single transaction row from a Canara Bank PDF statement.
The row may contain: Date, Description, Debit/Credit amount, Balance.
Extract and return the same JSON format as the SMS parser.
```

---

## 13. Deduplication Engine

### 13.1 When Deduplication Runs

- On every **PDF import** (PDF transactions matched against SMS transactions)
- NOT on SMS ingestion (SMS is always treated as new)

### 13.2 Matching Logic

Two transactions are considered **duplicates** if ALL of these match:
1. `user_id` matches
2. `amount` matches exactly
3. `transaction_date` matches exactly
4. `merchant` matches (case-insensitive, fuzzy — e.g., "ZOMATO" = "zomato" = "Zomato Online")
5. `type` matches (both debit or both credit)

### 13.3 Conflict Resolution

| Scenario | Action |
|---|---|
| SMS exists, PDF matches | Keep SMS record (it was first); skip PDF row |
| PDF has data SMS doesn't | Create new transaction from PDF |
| Multiple SMS match one PDF row | Keep first SMS; mark others for review |

---

## 14. Category Engine

### 14.1 Auto-Categorisation Priority

```
1. Merchant Memory (merchant_mappings table) — highest priority
2. Groq AI suggestion — fallback
3. "Other" — default if both fail
```

### 14.2 Merchant Memory Flow

```
Transaction arrives: "Zomato" → AI says "Food & Dining"
  → Check merchant_mappings for "Zomato"
  → If found → use mapped category (user's preference)
  → If not found → use AI suggestion

User later edits: changes "Zomato" from "Food & Dining" to "Entertainment"
  → Update/create merchant_mapping: "Zomato" → "Entertainment"
  → All future "Zomato" transactions → "Entertainment"
```

### 14.3 Bulk Recategorisation

API endpoint: `POST /api/categories/bulk-remap`
```json
{
  "merchant_pattern": "Zomato",
  "new_category_id": "uuid",
  "apply_retroactively": true
}
```
If `apply_retroactively = true` → updates all existing "Zomato" transactions too.

---

## 15. Budget & Alert System

### 15.1 Budget Periods

| Period | Calculation Window |
|---|---|
| Daily | Current day: midnight to midnight (IST) |
| Weekly | Monday 00:00 to Sunday 23:59 (IST) |
| Monthly | 1st 00:00 to last day 23:59 (IST) |

### 15.2 Alert Thresholds

- **80% reached** → Warning alert (yellow)
- **100% reached** → Danger alert (red)

### 15.3 Alert Delivery

| Channel | Implementation |
|---|---|
| In-app banner | Dashboard shows persistent banner until dismissed |
| Toast notification | Shown immediately when threshold crossed |
| Push notification | Via PWA service worker (if user grants permission) |

### 15.4 Budget Check Logic

Runs on every new transaction INSERT:
```
1. Get transaction's category_id
2. Query all active budgets for this user + category
3. For each budget (daily/weekly/monthly):
   a. Calculate total spend for current period
   b. If spend ≥ 80% of budget AND no 80% alert exists for this period → create alert
   c. If spend ≥ 100% of budget AND no 100% alert exists for this period → create alert
4. Also check "overall" budgets (category_id = NULL)
```

---

## 16. Export Engine

### 16.1 CSV Export

**Format:**
```csv
Date,Amount,Type,Payment Mode,Merchant,Category,UPI Ref,Balance,Note
2026-08-03,100.00,debit,upi,Zomato,Food & Dining,657803288445,984.03,
2026-08-02,130.00,debit,card_pos,,Other,,1833.27,POS transaction
```

### 16.2 PDF Export

Generated using a headless HTML → PDF renderer (e.g., `puppeteer` or `@react-pdf/renderer`).

**Contents:**
- Header: VAULT logo, date range, user name
- Summary table: totals by category and payment mode
- Chart images: category donut, trend bar
- Full transaction list table
- Footer: page numbers, generated timestamp

### 16.3 WhatsApp Share (V1 Stretch)

Pre-formatted text message:

```
📊 VAULT — August 2026 Summary

💸 Total Spent: ₹15,420
💰 Total Received: ₹50,000
📈 Net: +₹34,580

🍕 Food & Dining: ₹4,500
🛍️ Shopping: ₹3,200
🚗 Transport: ₹2,100
💡 Bills: ₹5,620

Powered by VAULT
```

Opens native share sheet with pre-filled text.

---

## 17. Error Handling & Retry

### 17.1 Global Error Handler

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  if (err.name === 'ZodError') {
    return res.status(422).json({ error: 'Validation failed', details: err.errors });
  }

  if (err.name === 'GroqError') {
    return res.status(503).json({ error: 'AI parser temporarily unavailable' });
  }

  res.status(500).json({ error: 'Internal server error' });
}
```

### 17.2 Retry Strategy

| Service | Retries | Backoff | Timeout |
|---|---|---|---|
| Groq API | 3 | Exponential (1s, 2s, 4s) | 10s per attempt |
| Supabase DB | 2 | Linear (500ms) | 5s per attempt |
| PDF parsing | 1 | — | 30s |

### 17.3 Dead Letter Queue

If a transaction SMS fails parsing after all retries:
1. Store in a `pending_sms` array (in-memory, flushed to DB)
2. Retry all pending items every 5 minutes via cron
3. After 3 failed cycles → flag as `is_flagged = true` with reason `"parse_failed_after_retries"`

---

## 18. Monitoring & Health Checks

### 18.1 Health Check Endpoint

`GET /api/health` — returns system status. Checked every 5 minutes by Railway's built-in monitor.

### 18.2 Logging

| Level | Use |
|---|---|
| `info` | Successful SMS parsed, transaction created |
| `warn` | Low confidence parse, rate limit approaching |
| `error` | Groq failure, DB error, auth failure |

All logs use `winston` with JSON format, output to stdout (Railway captures this).

### 18.3 Uptime Monitoring

**Option:** Use [UptimeRobot](https://uptimerobot.com) (free tier — 50 monitors):
- Monitor `GET /api/health` every 5 minutes
- Alert via email if endpoint returns non-200 for 2 consecutive checks

### 18.4 Alert Notifications

| Event | Alert Channel |
|---|---|
| Backend down > 10 min | Email |
| Groq API failures > 5 in 10 min | Email |
| Supabase connection lost | Email |
| SMS parse failure rate > 20% | Email |

---

## 19. Deployment Pipeline

### 19.1 Git Workflow

```
main branch → production
  └── feature branches → PRs → merge to main
```

### 19.2 Backend Deployment (Railway)

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: vault-backend
```

### 19.3 Frontend Deployment (Vercel)

Vercel auto-deploys on push to `main` when connected to the GitHub repo. No manual CI/CD config needed.

### 19.4 Environment Variables

- **Railway:** Set via Railway dashboard → Variables tab
- **Vercel:** Set via Vercel dashboard → Environment Variables

**Never commit `.env` files to git.** Use `.env.example` as a template.

---

## 20. Testing Strategy

### 20.1 Unit Tests

| Module | Tests |
|---|---|
| `groqParser.js` | Test with 10+ real Canara Bank SMS samples; verify parsed output |
| `deduplication.js` | Test exact match, fuzzy merchant match, edge cases |
| `categoryEngine.js` | Test merchant memory lookup, AI fallback, default |
| `budgetEngine.js` | Test 80%/100% threshold calculation across daily/weekly/monthly |
| `validators.js` | Test Zod schemas with valid and invalid inputs |

### 20.2 Integration Tests

| Flow | Test |
|---|---|
| SMS → Parse → DB | POST real SMS to `/api/sms`, verify DB row |
| PDF → Parse → Dedup | Upload statement, verify correct import count |
| Manual Entry | POST manual transaction, verify in DB |
| Budget Alert | Insert transactions exceeding budget, verify alert created |
| Export | Request CSV export, verify file contents |

### 20.3 End-to-End Test

1. Send a test SMS payload to `/api/sms`
2. Verify transaction appears in Supabase
3. Verify WebSocket broadcasts to connected client
4. Verify dashboard shows new transaction
5. Verify budget alert triggers if applicable

### 20.4 Test Runner

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "groqParser"
```

Framework: `vitest` (fast, ESM-native, compatible with Node 24).

---

## 21. Performance Requirements

| Metric | Target | Measurement |
|---|---|---|
| SMS → Dashboard latency | < 5 seconds | Time from POST /api/sms to WebSocket broadcast |
| Groq parse time | < 2 seconds | Time from Groq API call to response |
| Dashboard initial load | < 2 seconds | Lighthouse Performance score > 90 |
| PDF parse (3-month statement) | < 10 seconds | Upload to import summary response |
| API response (list transactions) | < 200ms | For up to 200 rows with filters |
| PWA service worker cache | Offline dashboard loads | No network required for cached pages |
| Concurrent WebSocket connections | 5 | Single user, multiple tabs/devices |

---

## Appendix

### A. Canara Bank SMS Formats (Known)

```
# UPI Debit
Dear Customer, Acct XXX430 Dr. INR {amount} on {DD/MM/YY} to {merchant}; UPI: {ref}; Bal INR {balance}-CanaraBank

# UPI Credit
Dear Customer, Acct XXX430 credited with INR {amount} on {DD/MM/YY} from {sender}; UPI:{ref}; Bal INR {balance}-CanaraBank

# Card (POS) Debit
A/c XXX430 linked to card debited INR {amount} on {DD/MM/YY} POS txn. Avl Bal INR {balance}. ... -Canara Bank

# NEFT Credit
An amount of INR {amount} has been credited to XXX430 on {DD/MM/YYYY} towards NEFT by Sender {name}, IFSC {code}, ... UTR {utr}, Total Avail. Bal INR {balance}- Canara Bank

# ATM Withdrawal
Dear Customer, Acct XXX430 Dr. INR {amount} on {DD/MM/YY} ATM WDL at {location}; Bal INR {balance}-CanaraBank
```

### B. Groq Free Tier Limits

| Limit | Value |
|---|---|
| Requests per minute | 30 |
| Requests per day | 14,400 |
| Tokens per minute | 6,000 |
| Context window | 131,072 tokens |

At ~2 requests per transaction (SMS parse + category check), this supports ~7,200 transactions/day — more than enough for a single user.

### C. Supabase Free Tier Limits

| Resource | Limit |
|---|---|
| Database size | 500 MB |
| API requests | 50,000/month |
| Realtime connections | 200 concurrent |
| Storage | 1 GB |
| Bandwidth | 2 GB/month |

At ~50 transactions/month with SMS text, this is well within limits for years of single-user usage.

### D. Railway Free Tier Limits

| Resource | Limit |
|---|---|
| Execution hours | 500 hours/month |
| Memory | 512 MB |
| Shared vCPU | Yes |
| Egress | 100 GB/month |

The backend is lightweight — should stay within free tier easily.

---

> **End of Document — VAULT TRD v1.0**
