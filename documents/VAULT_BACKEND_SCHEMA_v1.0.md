# VAULT — Backend Schema Document

**Version:** 1.0  
**Status:** Approved Specification  
**Date:** August 2026  
**Classification:** Confidential  
**Companion Documents:** [VAULT PRD v1.0](file:///c:/Users/ahame/vault/docs/VAULT_PRD_v1.0.docx) · [VAULT TRD v1.0](file:///c:/Users/ahame/vault/documents/VAULT_TRD_v1.0.md) · [VAULT App Flow v1.0](file:///c:/Users/ahame/vault/documents/VAULT_APP_FLOW_v1.0.md) · [VAULT UI/UX Design Flow v1.0](file:///c:/Users/ahame/vault/documents/VAULT_UI_UX_DESIGN_FLOW_v1.0.md)

---

## Table of Contents

1. [Database Architecture Overview](#1-database-architecture-overview)
2. [Custom Enum Types & Domains](#2-custom-enum-types--domains)
3. [Table Schemas (Complete DDL)](#3-table-schemas-complete-ddl)
4. [Indexes & Performance Optimisations](#4-indexes--performance-optimisations)
5. [Stored Functions & Triggers](#5-stored-functions--triggers)
6. [Row Level Security (RLS) Policies](#6-row-level-security-rls-policies)
7. [Realtime Publication Setup](#7-realtime-publication-setup)
8. [Complete Production SQL Migration Script](#8-complete-production-sql-migration-script)

---

## 1. Database Architecture Overview

VAULT is powered by **Supabase PostgreSQL**. The database schema is engineered for high-frequency writes (real-time SMS ingestion), instant real-time broadcasts over WebSockets, strict user data isolation via Row Level Security (RLS), and zero floating-point calculation errors for financial numbers.

### Architectural Highlights

- **Primary Keys:** `UUIDv4` via PostgreSQL `gen_random_uuid()` for all tables.
- **Timestamping:** `TIMESTAMPTZ` (Timestamp with Time Zone, defaulting to `now()`) for all date fields to maintain accurate Indian Standard Time (IST).
- **Currency Precision:** `DECIMAL(12, 2)` (up to 999,999,999.99 INR with exact 2-decimal paise precision).
- **Soft Deletion:** Transactions use `is_deleted BOOLEAN DEFAULT false` for non-destructive user deletes and instant undo support.
- **Automated Category Seeding:** A database trigger automatically populates 10 default categories with emojis and colors whenever a new user registers.
- **Automated Budget Alerts:** A database trigger monitors spending on every transaction insert and generates an alert row when 80% or 100% threshold limits are breached.

---

## 2. Custom Enum Types & Domains

```sql
-- Transaction Direction (Debit vs Credit)
CREATE TYPE transaction_type_enum AS ENUM (
    'debit',
    'credit'
);

-- Supported Payment Modes
CREATE TYPE payment_mode_enum AS ENUM (
    'upi',
    'card_pos',
    'atm',
    'neft',
    'imps',
    'rtgs',
    'cash',
    'other'
);

-- Transaction Capture Sources
CREATE TYPE source_type_enum AS ENUM (
    'sms',
    'pdf',
    'manual'
);

-- Budget Tracking Periods
CREATE TYPE budget_period_enum AS ENUM (
    'daily',
    'weekly',
    'monthly'
);

-- PDF Import Statuses
CREATE TYPE import_status_enum AS ENUM (
    'processing',
    'completed',
    'failed'
);
```

---

## 3. Table Schemas (Complete DDL)

### 3.1 `users` Table

Stores core user profile credentials and onboarding state.

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    setup_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3)
);
```

### 3.2 `categories` Table

Stores category definitions (system default and custom user-created categories).

```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#7C3AED',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);
```

### 3.3 `merchant_mappings` Table

Stores merchant memory patterns so user category corrections auto-apply to future transactions.

```sql
CREATE TABLE public.merchant_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_pattern TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_merchant_pattern UNIQUE (user_id, merchant_pattern)
);
```

### 3.4 `transactions` Table

The central table storing all incoming financial transactions.

```sql
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    type transaction_type_enum NOT NULL,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'upi',
    merchant TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    upi_ref TEXT,
    balance_after DECIMAL(12, 2),
    source source_type_enum NOT NULL DEFAULT 'sms',
    raw_sms TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flag_reason TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    groq_confidence DECIMAL(3, 2) CHECK (groq_confidence BETWEEN 0.00 AND 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.5 `budgets` Table

Defines category-specific or overall budget limits per daily, weekly, or monthly period.

```sql
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- NULL means Overall Budget
    period budget_period_enum NOT NULL DEFAULT 'monthly',
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_category_period UNIQUE (user_id, category_id, period)
);
```

### 3.6 `budget_alerts` Table

Stores notifications generated when spending reaches 80% or 100% of a budget limit.

```sql
CREATE TABLE public.budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    threshold INT NOT NULL CHECK (threshold IN (80, 100)),
    actual_amount DECIMAL(12, 2) NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_read BOOLEAN NOT NULL DEFAULT false
);
```

### 3.7 `statement_imports` Table

Tracks history and metrics of Canara Bank PDF statement uploads.

```sql
CREATE TABLE public.statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size_bytes INT,
    status import_status_enum NOT NULL DEFAULT 'processing',
    total_rows INT DEFAULT 0,
    imported_count INT DEFAULT 0,
    duplicate_count INT DEFAULT 0,
    error_message TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.8 `audit_log` Table

Maintains an immutable record of sensitive updates or deletions.

```sql
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- e.g., 'transaction', 'budget', 'category'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,      -- e.g., 'create', 'update', 'delete'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Indexes & Performance Optimisations

Indexes are tailored for high-speed feeds, date-range analytics filtering, merchant pattern matching, and rapid PDF deduplication queries.

```sql
-- 1. Primary Transactions Feed Index (User + Date Order)
CREATE INDEX idx_transactions_user_date 
ON public.transactions (user_id, transaction_date DESC, created_at DESC) 
WHERE is_deleted = false;

-- 2. Deduplication Index for PDF Import Matching
CREATE INDEX idx_transactions_dedup 
ON public.transactions (user_id, amount, transaction_date, merchant) 
WHERE is_deleted = false;

-- 3. Category Analytics Query Index
CREATE INDEX idx_transactions_category_analytics 
ON public.transactions (user_id, category_id, transaction_date) 
WHERE is_deleted = false;

-- 4. Payment Mode Analytics Index
CREATE INDEX idx_transactions_payment_mode 
ON public.transactions (user_id, payment_mode, transaction_date) 
WHERE is_deleted = false;

-- 5. Fast Merchant Pattern Memory Index
CREATE INDEX idx_merchant_mappings_lookup 
ON public.merchant_mappings (user_id, merchant_pattern);

-- 6. Unread Budget Alerts Index
CREATE INDEX idx_budget_alerts_unread 
ON public.budget_alerts (user_id, is_read, triggered_at DESC);
```

---

## 5. Stored Functions & Triggers

### 5.1 Auto-Updating `updated_at` Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_update_timestamp
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_transactions_update_timestamp
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();
```

### 5.2 Automatic Category Seeding on New User Registration

When a new user signs up, this function automatically creates 10 default categories for them:

```sql
CREATE OR REPLACE FUNCTION public.fn_seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.categories (user_id, name, emoji, color, is_default)
    VALUES
        (NEW.id, 'Food & Dining', '🍕', '#F97316', true),
        (NEW.id, 'Transport', '🚗', '#3B82F6', true),
        (NEW.id, 'Shopping', '🛍️', '#8B5CF6', true),
        (NEW.id, 'Bills & Utilities', '💡', '#F59E0B', true),
        (NEW.id, 'Entertainment', '🎬', '#EC4899', true),
        (NEW.id, 'Health', '💊', '#10B981', true),
        (NEW.id, 'Education', '📚', '#6366F1', true),
        (NEW.id, 'Cash Withdrawal', '🏧', '#6B7280', true),
        (NEW.id, 'Transfer', '🏦', '#14B8A6', true),
        (NEW.id, 'Other', '📦', '#9CA3AF', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_seed_categories
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_seed_default_categories();
```

### 5.3 Automated Budget Threshold Check Trigger

Evaluates spending whenever a debit transaction is added, creating an alert row if limits reach 80% or 100%.

```sql
CREATE OR REPLACE FUNCTION public.fn_check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    b RECORD;
    current_spend DECIMAL(12,2);
    start_dt DATE;
    end_dt DATE;
BEGIN
    -- Only evaluate on debit transactions that are active
    IF NEW.type != 'debit' OR NEW.is_deleted = true THEN
        RETURN NEW;
    END IF;

    -- Loop through all active budgets matching the user and category (or overall)
    FOR b IN 
        SELECT * FROM public.budgets 
        WHERE user_id = NEW.user_id 
          AND is_active = true 
          AND (category_id = NEW.category_id OR category_id IS NULL)
    LOOP
        -- Determine Date Range based on Period
        IF b.period = 'daily' THEN
            start_dt := NEW.transaction_date;
            end_dt := NEW.transaction_date;
        ELSIF b.period = 'weekly' THEN
            start_dt := date_trunc('week', NEW.transaction_date)::DATE;
            end_dt := (start_dt + INTERVAL '6 days')::DATE;
        ELSIF b.period = 'monthly' THEN
            start_dt := date_trunc('month', NEW.transaction_date)::DATE;
            end_dt := (date_trunc('month', NEW.transaction_date) + INTERVAL '1 month - 1 day')::DATE;
        END IF;

        -- Calculate cumulative spend for period
        SELECT COALESCE(SUM(amount), 0.00) INTO current_spend
        FROM public.transactions
        WHERE user_id = NEW.user_id
          AND type = 'debit'
          AND is_deleted = false
          AND transaction_date BETWEEN start_dt AND end_dt
          AND (b.category_id IS NULL OR category_id = b.category_id);

        -- Check 100% threshold breach
        IF current_spend >= b.amount THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.budget_alerts 
                WHERE budget_id = b.id AND threshold = 100 AND triggered_at >= start_dt::TIMESTAMPTZ
            ) THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, threshold, actual_amount)
                VALUES (NEW.user_id, b.id, 100, current_spend);
            END IF;
        -- Check 80% threshold breach
        ELSIF current_spend >= (b.amount * 0.80) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.budget_alerts 
                WHERE budget_id = b.id AND threshold = 80 AND triggered_at >= start_dt::TIMESTAMPTZ
            ) THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, threshold, actual_amount)
                VALUES (NEW.user_id, b.id, 80, current_spend);
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_check_budget
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_alerts();
```

---

## 6. Row Level Security (RLS) Policies

All public tables have RLS enabled to isolate data strictly per user.

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 1. Users Policy
CREATE POLICY "Users can access own profile" ON public.users
    FOR ALL USING (auth.uid() = id);

-- 2. Categories Policy
CREATE POLICY "Users can access own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

-- 3. Merchant Mappings Policy
CREATE POLICY "Users can access own merchant mappings" ON public.merchant_mappings
    FOR ALL USING (auth.uid() = user_id);

-- 4. Transactions Policy
CREATE POLICY "Users can access own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- 5. Budgets Policy
CREATE POLICY "Users can access own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id);

-- 6. Budget Alerts Policy
CREATE POLICY "Users can access own budget alerts" ON public.budget_alerts
    FOR ALL USING (auth.uid() = user_id);

-- 7. Statement Imports Policy
CREATE POLICY "Users can access own statement imports" ON public.statement_imports
    FOR ALL USING (auth.uid() = user_id);

-- 8. Audit Log Policy
CREATE POLICY "Users can view own audit logs" ON public.audit_log
    FOR SELECT USING (auth.uid() = user_id);
```

---

## 7. Realtime Publication Setup

Enable Supabase Realtime subscriptions for `transactions` and `budget_alerts` so open dashboard clients receive instant updates over WebSockets:

```sql
-- Add transactions & budget_alerts to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_alerts;
```

---

## 8. Complete Production SQL Migration Script

Below is the complete, single-file DDL execution script that can be pasted directly into the **Supabase SQL Editor** to initialize the VAULT database:

```sql
-- =============================================================================
-- VAULT DATABASE INITIALISATION MIGRATION SCRIPT
-- Version: 1.0
-- Target: Supabase PostgreSQL
-- =============================================================================

BEGIN;

-- 1. ENUMS & TYPES
CREATE TYPE transaction_type_enum AS ENUM ('debit', 'credit');
CREATE TYPE payment_mode_enum AS ENUM ('upi', 'card_pos', 'atm', 'neft', 'imps', 'rtgs', 'cash', 'other');
CREATE TYPE source_type_enum AS ENUM ('sms', 'pdf', 'manual');
CREATE TYPE budget_period_enum AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE import_status_enum AS ENUM ('processing', 'completed', 'failed');

-- 2. TABLES
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    setup_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3)
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#7C3AED',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);

CREATE TABLE public.merchant_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_pattern TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_merchant_pattern UNIQUE (user_id, merchant_pattern)
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    type transaction_type_enum NOT NULL,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'upi',
    merchant TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    upi_ref TEXT,
    balance_after DECIMAL(12, 2),
    source source_type_enum NOT NULL DEFAULT 'sms',
    raw_sms TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flag_reason TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    groq_confidence DECIMAL(3, 2) CHECK (groq_confidence BETWEEN 0.00 AND 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    period budget_period_enum NOT NULL DEFAULT 'monthly',
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_category_period UNIQUE (user_id, category_id, period)
);

CREATE TABLE public.budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    threshold INT NOT NULL CHECK (threshold IN (80, 100)),
    actual_amount DECIMAL(12, 2) NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_read BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size_bytes INT,
    status import_status_enum NOT NULL DEFAULT 'processing',
    total_rows INT DEFAULT 0,
    imported_count INT DEFAULT 0,
    duplicate_count INT DEFAULT 0,
    error_message TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_transactions_dedup ON public.transactions (user_id, amount, transaction_date, merchant) WHERE is_deleted = false;
CREATE INDEX idx_transactions_category_analytics ON public.transactions (user_id, category_id, transaction_date) WHERE is_deleted = false;
CREATE INDEX idx_transactions_payment_mode ON public.transactions (user_id, payment_mode, transaction_date) WHERE is_deleted = false;
CREATE INDEX idx_merchant_mappings_lookup ON public.merchant_mappings (user_id, merchant_pattern);
CREATE INDEX idx_budget_alerts_unread ON public.budget_alerts (user_id, is_read, triggered_at DESC);

-- 4. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.fn_update_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_update_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();
CREATE TRIGGER trg_transactions_update_timestamp BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE OR REPLACE FUNCTION public.fn_seed_default_categories() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.categories (user_id, name, emoji, color, is_default)
    VALUES
        (NEW.id, 'Food & Dining', '🍕', '#F97316', true),
        (NEW.id, 'Transport', '🚗', '#3B82F6', true),
        (NEW.id, 'Shopping', '🛍️', '#8B5CF6', true),
        (NEW.id, 'Bills & Utilities', '💡', '#F59E0B', true),
        (NEW.id, 'Entertainment', '🎬', '#EC4899', true),
        (NEW.id, 'Health', '💊', '#10B981', true),
        (NEW.id, 'Education', '📚', '#6366F1', true),
        (NEW.id, 'Cash Withdrawal', '🏧', '#6B7280', true),
        (NEW.id, 'Transfer', '🏦', '#14B8A6', true),
        (NEW.id, 'Other', '📦', '#9CA3AF', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_seed_categories AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_seed_default_categories();

CREATE OR REPLACE FUNCTION public.fn_check_budget_alerts() RETURNS TRIGGER AS $$
DECLARE
    b RECORD; current_spend DECIMAL(12,2); start_dt DATE; end_dt DATE;
BEGIN
    IF NEW.type != 'debit' OR NEW.is_deleted = true THEN RETURN NEW; END IF;

    FOR b IN SELECT * FROM public.budgets WHERE user_id = NEW.user_id AND is_active = true AND (category_id = NEW.category_id OR category_id IS NULL) LOOP
        IF b.period = 'daily' THEN start_dt := NEW.transaction_date; end_dt := NEW.transaction_date;
        ELSIF b.period = 'weekly' THEN start_dt := date_trunc('week', NEW.transaction_date)::DATE; end_dt := (start_dt + INTERVAL '6 days')::DATE;
        ELSIF b.period = 'monthly' THEN start_dt := date_trunc('month', NEW.transaction_date)::DATE; end_dt := (date_trunc('month', NEW.transaction_date) + INTERVAL '1 month - 1 day')::DATE;
        END IF;

        SELECT COALESCE(SUM(amount), 0.00) INTO current_spend FROM public.transactions
        WHERE user_id = NEW.user_id AND type = 'debit' AND is_deleted = false AND transaction_date BETWEEN start_dt AND end_dt AND (b.category_id IS NULL OR category_id = b.category_id);

        IF current_spend >= b.amount THEN
            IF NOT EXISTS (SELECT 1 FROM public.budget_alerts WHERE budget_id = b.id AND threshold = 100 AND triggered_at >= start_dt::TIMESTAMPTZ) THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, threshold, actual_amount) VALUES (NEW.user_id, b.id, 100, current_spend);
            END IF;
        ELSIF current_spend >= (b.amount * 0.80) THEN
            IF NOT EXISTS (SELECT 1 FROM public.budget_alerts WHERE budget_id = b.id AND threshold = 80 AND triggered_at >= start_dt::TIMESTAMPTZ) THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, threshold, actual_amount) VALUES (NEW.user_id, b.id, 80, current_spend);
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_check_budget AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_alerts();

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own profile" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can access own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own merchant mappings" ON public.merchant_mappings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own budget alerts" ON public.budget_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own statement imports" ON public.statement_imports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own audit logs" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);

-- 6. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_alerts;

COMMIT;
```

---

> **End of Document — VAULT Backend Schema v1.0**
