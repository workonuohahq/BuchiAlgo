-- ============================================================
-- BUCHIALGO SYSTEM SEED DATA
-- Initial configuration and default subscription tiers
-- ============================================================

-- ============================================================
-- SYSTEM CONFIGURATION: Core dynamic variables
-- All platform branding, math parameters, and gateway keys
-- ============================================================
INSERT INTO system_config (key, value, updated_at) VALUES
('platform_name', '"BuchiAlgo"', NOW()),
('platform_initials', '"BUCHI"', NOW()),
('default_currency', '"USD"', NOW()),
('currency_symbol', '"$"', NOW()),
('support_url', '"https://t.me/BuchiAlgoSupport"', NOW()),
('support_telegram', '"@BuchiAlgoSupport"', NOW()),
('welcome_message', '"Welcome to BuchiAlgo — your institutional-grade quantitative trading analytics engine. Every signal is derived from pure mathematical structures, zero AI hallucinations."', NOW()),

-- Force-join configuration
('required_channels', '["@BuchiAlgoOfficial", "@BuchiAlgoAlpha"]', NOW()),
('force_join_enabled', 'true', NOW()),
('join_verification_ttl_hours', '24', NOW()),

-- Referral system
('referral_reward_credits', '3', NOW()),
('referral_max_per_user', '50', NOW()),

-- Math engine parameters
('math_parameters', '{
    "lookback_period": 200,
    "swing_lookback": 5,
    "fvg_min_size_pct": 0.15,
    "fvg_max_age_candles": 50,
    "ob_volume_multiplier": 1.5,
    "ob_lookback": 3,
    "atr_multiplier_sl": 1.5,
    "atr_multiplier_tp1": 2.0,
    "atr_multiplier_tp2": 3.5,
    "atr_multiplier_tp3": 5.0,
    "mss_breakout_threshold": 0.5,
    "volume_ma_period": 20,
    "enable_fvg": true,
    "enable_ifvg": true,
    "enable_ob": true,
    "enable_mss": true,
    "quarter_rounding_precision": 2,
    "min_candles_required": 50
}', NOW()),

-- Payment gateway configuration (keys encrypted at application layer)
('payment_gateway_keys', '{
    "paystack_public": "",
    "paystack_secret": "",
    "paystack_webhook_secret": "",
    "nowpayments_api_key": "",
    "nowpayments_ipn_secret": "",
    "manual_transfer_enabled": true,
    "manual_bank_name": "Example Bank",
    "manual_account_number": "1234567890",
    "manual_account_name": "BuchiAlgo Ltd",
    "manual_instructions": "Transfer the exact amount and upload your receipt."
}', NOW()),

-- Affiliate configuration
('affiliate_config', '{
    "commission_rate": 20,
    "min_payout_amount": 50,
    "payout_methods": ["bank_transfer", "crypto_usdt"],
    "form_fields": [
        {"id": "full_name", "label": "Full Name", "type": "text", "required": true},
        {"id": "email", "label": "Email Address", "type": "email", "required": true},
        {"id": "country", "label": "Country", "type": "text", "required": true},
        {"id": "experience", "label": "Trading Experience", "type": "select", "required": true, "options": ["Beginner", "Intermediate", "Advanced", "Professional"]},
        {"id": "audience_size", "label": "Estimated Audience Size", "type": "select", "required": true, "options": ["< 1,000", "1,000 - 5,000", "5,000 - 20,000", "20,000+"]},
        {"id": "promotion_plan", "label": "How do you plan to promote BuchiAlgo?", "type": "textarea", "required": true}
    ]
}', NOW()),

-- Telegram bot configuration
('bot_config', '{
    "scan_command_cooldown_sec": 30,
    "max_concurrent_scans": 5,
    "result_display_mode": "inline_keyboard",
    "premium_scan_speed": "instant",
    "free_scan_speed": "queued"
}', NOW())

ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================
-- DEFAULT SUBSCRIPTION TIERS
-- ============================================================
INSERT INTO subscription_tiers (name, price, billing_cycle, scan_limit, features, is_active) VALUES
(
    'Alpha Starter',
    29.99,
    'monthly',
    100,
    ARRAY[
        '100 Scans/month',
        'Real-time FVG Detection',
        'Order Block Analysis',
        'Market Structure Signals',
        '1-Click TradingView Export',
        'Telegram Priority Alerts',
        'Standard Support'
    ],
    true
),
(
    'Alpha Pro',
    79.99,
    'monthly',
    500,
    ARRAY[
        '500 Scans/month',
        'All Starter Features',
        'Inverse FVG (IFVG) Detection',
        'Volume-Weighted OB Analysis',
        'Custom Timeframes (1m - 1D)',
        'Export to CSV/JSON',
        'Priority Support Queue',
        'Early Access to New Indicators'
    ],
    true
),
(
    'Institutional',
    199.99,
    'monthly',
    -1,
    ARRAY[
        'Unlimited Scans',
        'All Pro Features',
        'Multi-Timeframe Confluence',
        'Institutional OIE Precision',
        'Webhook API Access',
        'White-Label Reports',
        'Dedicated Account Manager',
        'Custom Strategy Parameters',
        'Affiliate Program Access'
    ],
    true
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- INSERT DEFAULT ADMIN USER (update telegram_id as needed)
-- ============================================================
-- INSERT INTO users (telegram_id, alphanumeric_id, join_verified, scan_credits, role)
-- VALUES (123456789, 'BUCHI-ADMIN1', true, 9999, 'admin')
-- ON CONFLICT (telegram_id) DO NOTHING;
