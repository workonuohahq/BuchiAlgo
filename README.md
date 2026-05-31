# BuchiAlgo — Quantitative Trading Analytics Ecosystem

A high-performance, deterministic trading execution and analytics platform featuring a Telegram Bot, Mini App WebView, and a comprehensive Admin Command Center. Built with pure mathematical formulas — zero AI models.

## Architecture Overview

```
                    +-------------------+
                    |   Telegram Bot    |
                    |  (Mini App View)  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Next.js App     |
                    |  (API + /admin)   |
                    +--------+----------+
                             |
                    +--------v----------+
                    | Supabase (Postgres|
                    |   + Config Store  |
                    +--------+----------+
                             |
              +--------------v-------------+
              |    Deterministic Math      |
              |       Engine (OIE)         |
              +----------------------------+
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts, shadcn/ui |
| Backend | Next.js API Routes, tRPC-ready, Hono-ready |
| Database | Supabase PostgreSQL with RLS |
| Bot | node-telegram-bot-api |
| Math | Custom deterministic engine (FVG, MSS, OB, OIE) |
| Data | CCXT for OHLCV market data |
| Payments | Paystack, NOWPayments, Manual Bank Transfer |

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- Telegram Bot Token (@BotFather)
- (Optional) Paystack account
- (Optional) NOWPayments account

### 1. Environment Setup

Copy `.env.local` and fill in your credentials:

```bash
cp .env.local .env
```

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-super-secret-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 2. Database Setup

Run the schema SQL in Supabase SQL Editor:

```bash
# Execute db/schema.sql in Supabase SQL Editor
# Then execute db/seed.sql for default config
```

### 3. Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`

### 4. Start the Telegram Bot

```bash
# In a separate terminal
npx tsx bot/src/index.ts
```

## Project Structure

```
/mnt/agents/output/app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/              # Admin Command Center
│   │   │   ├── algorithm/      # Control Module A: Math params
│   │   │   ├── branding/       # Control Module B: Platform config
│   │   │   ├── gateways/       # Control Module C: Payment gateways
│   │   │   ├── affiliates/     # Control Module D: Affiliate Hub
│   │   │   ├── broadcast/      # Control Module E: Mass messaging
│   │   │   ├── analytics/      # Performance metrics
│   │   │   ├── settings/       # System settings
│   │   │   ├── layout.tsx      # Admin sidebar layout
│   │   │   └── page.tsx        # Admin dashboard
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # Admin authentication
│   │   │   ├── webhooks/       # Paystack, NOWPayments, Telegram
│   │   │   ├── analyze/        # Math engine API
│   │   │   ├── checkout/       # Payment initiation
│   │   │   └── admin/          # Admin CRUD APIs
│   │   ├── checkout/           # Checkout page
│   │   ├── page.tsx            # Landing page
│   │   └── layout.tsx          # Root layout
│   ├── lib/
│   │   ├── math/               # Deterministic math engine
│   │   │   ├── engine.ts       # Core analysis logic
│   │   │   ├── dataFetch.ts    # CCXT OHLCV fetching
│   │   │   └── types.ts        # Type definitions
│   │   └── supabase/           # Supabase clients
│   ├── middleware.ts           # Admin route protection
│   └── app/globals.css         # Global styles
├── bot/                        # Telegram Bot
│   └── src/
│       ├── commands/           # Bot commands
│       ├── handlers/           # Callbacks, referrals
│       ├── middleware/         # Force-join enforcement
│       ├── utils/              # ID generator, Supabase
│       └── index.ts            # Bot entry point
├── db/                         # Database files
│   ├── schema.sql              # Full schema + RLS
│   └── seed.sql                # Default configuration
└── package.json
```

## Core Features

### Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start [refCode]` | Register, force-join check, referral capture |
| `/analyze [symbol] [tf]` | Run quantitative analysis |
| `/dashboard` | View stats, credits, referrals |

### Deterministic Math Engine

- **Fair Value Gap (FVG)** detection with configurable min size
- **Inverse FVG (IFVG)** detection for gap-fill scenarios
- **Market Structure Shift (MSS)** with volume confirmation
- **Order Block (OB)** detection with volume multiplier
- **Optimal Institutional Entry (OIE)** with quarter-rounding to .00/.25/.50/.75
- **ATR-based** stop loss and take profit levels (TP1, TP2, TP3)

### Admin Control Modules

| Module | Description |
|--------|-------------|
| A — Algorithm Matrix | Sliders for all math parameters, strategy toggles |
| B — Branding & Copy | Platform name, currency, welcome message |
| C — Gateway Matrix | Paystack/NOWPayments/Manual config with secure key storage |
| D — Affiliate Hub | Kanban board for applications, payout processing |
| E — Broadcast Engine | Targeted mass messaging (all/premium/single user) |

### Payment Gateways

- **Paystack**: Card payments with webhook verification
- **NOWPayments**: Crypto (USDT, BTC, ETH) with IPN callbacks
- **Manual Bank Transfer**: Receipt upload, admin verification queue

## Dynamic Configuration

All platform variables are stored in `system_config` and instantly reflected:

- `platform_name` — displayed name
- `platform_initials` — ID prefix (e.g., "BUCHI")
- `default_currency` / `currency_symbol` — pricing display
- `math_parameters` — all algorithm variables
- `payment_gateway_keys` — secure API credentials
- `affiliate_config` — commission rates, form fields
- `required_channels` — force-join channel list

## Security

- Row-Level Security (RLS) on all database tables
- Server-side admin auth with JWT sessions
- Paystack webhook signature verification
- NOWPayments IPN secret verification
- 24-hour force-join verification caching
- Service role key isolation for bot operations

## License

MIT — Built for institutional trading precision.
