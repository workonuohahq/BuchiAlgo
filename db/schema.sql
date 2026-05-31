-- ============================================================
-- BUCHIALGO TRADING ANALYTICS ECOSYSTEM — DATABASE SCHEMA
-- Supabase PostgreSQL with RLS Policies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: system_config
-- Global dynamic configuration key-value store (JSONB)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for system_config: Public read, admin write
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "system_config_public_read" ON system_config;
    DROP POLICY IF EXISTS "system_config_admin_write" ON system_config;
    
    CREATE POLICY "system_config_public_read" ON system_config
        FOR SELECT TO public USING (true);
    
    CREATE POLICY "system_config_admin_write" ON system_config
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- TABLE: users
-- Core user accounts linked to Telegram IDs
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    alphanumeric_id VARCHAR(20) UNIQUE NOT NULL,
    join_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    scan_credits INT DEFAULT 5,
    referred_by VARCHAR(20) REFERENCES users(alphanumeric_id),
    is_premium BOOLEAN DEFAULT false,
    premium_until TIMESTAMPTZ,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_alphanumeric_id ON users(alphanumeric_id);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- RLS for users: Users can read own record, admins can read all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "users_self_read" ON users;
    DROP POLICY IF EXISTS "users_admin_all" ON users;
    DROP POLICY IF EXISTS "users_self_update" ON users;
    
    CREATE POLICY "users_self_read" ON users
        FOR SELECT TO authenticated 
        USING (telegram_id::text = auth.jwt() ->> 'telegram_id' OR auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "users_admin_all" ON users
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "users_service_insert" ON users
        FOR INSERT TO service_role WITH CHECK (true);
END $$;

-- ============================================================
-- TABLE: subscription_tiers
-- Premium subscription plan definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    scan_limit INT NOT NULL DEFAULT -1,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "subscription_tiers_public_read" ON subscription_tiers;
    DROP POLICY IF EXISTS "subscription_tiers_admin_write" ON subscription_tiers;
    
    CREATE POLICY "subscription_tiers_public_read" ON subscription_tiers
        FOR SELECT TO public USING (true);
    
    CREATE POLICY "subscription_tiers_admin_write" ON subscription_tiers
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- TABLE: transactions
-- Payment transaction records (Paystack, NOWPayments, Manual)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('paystack', 'nowpayments', 'manual')),
    provider_tx_id VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    proof_image_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_tx_id ON transactions(provider_tx_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "transactions_self_read" ON transactions;
    DROP POLICY IF EXISTS "transactions_admin_all" ON transactions;
    
    CREATE POLICY "transactions_self_read" ON transactions
        FOR SELECT TO authenticated 
        USING (EXISTS (
            SELECT 1 FROM users WHERE users.id = transactions.user_id 
            AND users.telegram_id::text = auth.jwt() ->> 'telegram_id'
        ) OR auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "transactions_admin_all" ON transactions
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "transactions_webhook_insert" ON transactions
        FOR INSERT TO service_role WITH CHECK (true);
END $$;

-- ============================================================
-- TABLE: affiliate_applications
-- Affiliate program applications with dynamic form data
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_applications_status ON affiliate_applications(status);

ALTER TABLE affiliate_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "affiliate_applications_self" ON affiliate_applications;
    DROP POLICY IF EXISTS "affiliate_applications_admin" ON affiliate_applications;
    
    CREATE POLICY "affiliate_applications_self" ON affiliate_applications
        FOR SELECT TO authenticated 
        USING (EXISTS (
            SELECT 1 FROM users WHERE users.id = affiliate_applications.user_id 
            AND users.telegram_id::text = auth.jwt() ->> 'telegram_id'
        ) OR auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "affiliate_applications_admin" ON affiliate_applications
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- TABLE: payout_requests
-- Affiliate payout withdrawal requests
-- ============================================================
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    routing_data JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_affiliate ON payout_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "payout_requests_affiliate_read" ON payout_requests;
    DROP POLICY IF EXISTS "payout_requests_admin_all" ON payout_requests;
    
    CREATE POLICY "payout_requests_affiliate_read" ON payout_requests
        FOR SELECT TO authenticated 
        USING (EXISTS (
            SELECT 1 FROM users WHERE users.id = payout_requests.affiliate_id 
            AND users.telegram_id::text = auth.jwt() ->> 'telegram_id'
        ) OR auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "payout_requests_admin_all" ON payout_requests
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- TABLE: referral_tracking
-- Tracks referral relationships and credit awards
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id VARCHAR(20) NOT NULL REFERENCES users(alphanumeric_id),
    referred_id VARCHAR(20) NOT NULL REFERENCES users(alphanumeric_id),
    credits_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON referral_tracking(referrer_id);

ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "referral_tracking_public_read" ON referral_tracking;
    DROP POLICY IF EXISTS "referral_tracking_service_insert" ON referral_tracking;
    
    CREATE POLICY "referral_tracking_public_read" ON referral_tracking
        FOR SELECT TO authenticated USING (true);
    
    CREATE POLICY "referral_tracking_service_insert" ON referral_tracking
        FOR INSERT TO service_role WITH CHECK (true);
END $$;

-- ============================================================
-- TABLE: broadcast_messages
-- Admin mass message dispatch queue and tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "broadcast_messages_admin" ON broadcast_messages;
    
    CREATE POLICY "broadcast_messages_admin" ON broadcast_messages
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- TABLE: bot_command_logs
-- Audit trail for bot command usage and errors
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_command_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT NOT NULL,
    command VARCHAR(100) NOT NULL,
    params JSONB DEFAULT '{}',
    response JSONB,
    error TEXT,
    processing_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_logs_telegram ON bot_command_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created ON bot_command_logs(created_at);

-- Admin-only access for logs
ALTER TABLE bot_command_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "bot_logs_admin_read" ON bot_command_logs;
    
    CREATE POLICY "bot_logs_admin_read" ON bot_command_logs
        FOR SELECT TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- TABLE: scan_results
-- Stores historical scan/analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    analysis_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_user ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_created ON scan_results(created_at);

ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "scan_results_self" ON scan_results;
    DROP POLICY IF EXISTS "scan_results_admin" ON scan_results;
    
    CREATE POLICY "scan_results_self" ON scan_results
        FOR SELECT TO authenticated 
        USING (EXISTS (
            SELECT 1 FROM users WHERE users.id = scan_results.user_id 
            AND users.telegram_id::text = auth.jwt() ->> 'telegram_id'
        ) OR auth.jwt() ->> 'role' = 'admin');
    
    CREATE POLICY "scan_results_admin" ON scan_results
        FOR ALL TO authenticated 
        USING (auth.jwt() ->> 'role' = 'admin')
        WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- ============================================================
-- FUNCTION: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DO $$ BEGIN
    -- users
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- system_config
    DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
    CREATE TRIGGER update_system_config_updated_at
        BEFORE UPDATE ON system_config
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- transactions
    DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
    CREATE TRIGGER update_transactions_updated_at
        BEFORE UPDATE ON transactions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;
