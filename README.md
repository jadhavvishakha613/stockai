# StockVision — AI-Powered Stock Market Analysis Platform

A full-stack, authentication-gated web application that delivers real-time stock market data, AI-assisted price predictions, multi-stock comparison, and market insights. Built with React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

---

## 🚀 Live Demo

**[https://stockai1-mavdt0p8i-jvishakha950-3756.vercel.app](https://stockai1-mavdt0p8i-jvishakha950-3756.vercel.app)**

---

## 📌 Overview

StockVision lets authenticated users analyse US-listed stocks in real time. Stock price data is sourced from the Yahoo Finance v8 API (no API key required) and proxied through a Vercel serverless function to avoid CORS restrictions. Predictions are generated either by Google Gemini 1.5 Flash (when an API key is provided) or by a built-in technical-analysis algorithm; results are cached in Supabase so the same symbol is not re-predicted more than once per day.

The entire application sits behind Supabase email/password authentication — all four main pages (Home, Predict, Compare, Insights) are protected and redirect to the sign-in page for unauthenticated users.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| **Real-time stock data** | Live price, daily change, day high/low, and volume via Yahoo Finance v8 |
| **AI price prediction** | Next-day price prediction using Google Gemini 1.5 Flash with a technical-analysis fallback |
| **Prediction caching** | Supabase caches each prediction per symbol per calendar day — no redundant AI calls |
| **Stock comparison** | Compare up to 5 stocks side-by-side with a normalised percentage-change chart (Recharts) |
| **Market insights** | Per-stock sentiment, fear/greed index, volatility classification, and buy/sell/hold recommendation derived from live data |
| **Authentication** | Supabase email/password — sign up, sign in, password reset, and email verification |
| **Protected routes** | All main pages require an active session; unauthenticated requests redirect to `/auth` |
| **Responsive, dark-first UI** | Built with shadcn/ui (Radix UI) + Tailwind CSS; mobile navigation included |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| Charts | Recharts 2 |
| Auth & Database | Supabase (PostgreSQL + Row Level Security) |
| AI | Google Gemini 1.5 Flash (`gemini-1.5-flash-latest`) — optional |
| Stock Data | Yahoo Finance v8 chart API — no key required |
| Routing | React Router DOM v6 |
| State / Fetching | TanStack React Query v5 |
| Serverless Proxy | Vercel serverless function (`api/yahoo.ts`) |
| Deployment | Vercel (static + serverless functions) |

---

## 🏗️ Project Structure

```
stockvision/
├── api/
│   ├── yahoo.ts              # Vercel serverless proxy → Yahoo Finance (handles CORS)
│   └── tsconfig.json         # TypeScript config for the api/ directory
├── src/
│   ├── components/
│   │   ├── Navigation.tsx    # Sticky top nav with mobile menu and user dropdown
│   │   ├── ProtectedRoute.tsx# Auth guard — redirects unauthenticated users to /auth
│   │   ├── StockCard.tsx     # Individual stock tile (price, change, volume)
│   │   ├── StockChart.tsx    # Recharts area/line chart wrapper
│   │   ├── UserMenu.tsx      # User dropdown (sign out)
│   │   └── ui/               # shadcn/ui component library (Radix UI based)
│   ├── contexts/
│   │   └── AuthContext.tsx   # Supabase auth state, signUp/signIn/signOut/resetPassword
│   ├── hooks/
│   │   ├── useStockData.ts   # fetchStockPrice, fetchStockChart, fetchMarketOverview
│   │   └── useStockPrediction.ts # Gemini AI + technical analysis + Supabase cache
│   ├── integrations/supabase/
│   │   ├── client.ts         # Supabase client (reads VITE_SUPABASE_* from .env)
│   │   └── types.ts          # Generated TypeScript DB types
│   ├── pages/
│   │   ├── Home.tsx          # Dashboard — market overview, featured chart, quick actions
│   │   ├── Predict.tsx       # AI prediction page with stock search and chart
│   │   ├── Compare.tsx       # Multi-stock normalised performance comparison
│   │   ├── Insights.tsx      # Market sentiment, fear/greed index, per-stock analysis
│   │   ├── Auth.tsx          # Sign in / sign up / password reset
│   │   └── NotFound.tsx      # 404 page
│   ├── lib/utils.ts          # cn() Tailwind class helper
│   ├── App.tsx               # Router and provider setup
│   └── main.tsx              # React entry point
├── supabase/
│   ├── migrations/
│   │   └── 20250101000000_initial_schema.sql  # DB schema (run once in SQL Editor)
│   └── functions/
│       ├── stock-data/       # Supabase edge function: Yahoo Finance proxy (alternative)
│       └── gemini-stock-prediction/  # Supabase edge function: Gemini prediction (alternative)
├── .env.example              # Environment variable template
├── vercel.json               # Vercel routing config
├── vite.config.ts            # Vite config + dev proxy for /api/yahoo
├── tailwind.config.ts
└── package.json
```

---

## ⚙️ How It Works

### Stock data flow

```
Browser  →  /api/yahoo/v8/finance/chart/<SYMBOL>
         →  Vercel function api/yahoo.ts
         →  https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>
         ←  JSON response proxied back to the browser
```

In development, Vite's `server.proxy` rewrites `/api/yahoo/*` directly to Yahoo Finance, so no Vercel function is needed locally.

### AI prediction flow

```
useStockPrediction.generatePrediction(symbol, currentPrice, historicalPrices)
  1. Check Supabase cache (stock_predictions WHERE symbol = X AND prediction_date = today)
  2a. Cache hit  → return cached result immediately
  2b. Cache miss → call Gemini 1.5 Flash with current + 30-day historical prices
                   OR fall back to technical analysis if no API key is set
  3. Write result to Supabase cache (upsert on symbol + prediction_date)
  4. Return { predictedPrice, confidence, reasoning }
```

### Technical analysis fallback

When `VITE_GEMINI_API_KEY` is not set (or Gemini is unavailable), the app computes a prediction locally using:

- **5-day vs 10-day moving average crossover** — direction signal
- **Linear trend slope** (last 10 data points) — trend magnitude
- **5-day price momentum** — short-term acceleration
- **Log-return standard deviation** — volatility cap (`min(5%, volatility × 2)`)
- Confidence range: 50–92 %

---

## 🔧 Installation & Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [Supabase](https://supabase.com) account (free tier is sufficient)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd stockvision
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key

# Optional — enables Gemini AI predictions
# Get a free key at https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> `.env` is listed in `.gitignore` — never commit it.

### 3. Set up the Supabase database

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Open **SQL Editor** and paste the contents of [`supabase/migrations/20250101000000_initial_schema.sql`](supabase/migrations/20250101000000_initial_schema.sql).
3. Click **Run**.

This creates three tables with Row Level Security enabled:

| Table | Purpose |
|---|---|
| `profiles` | User profile — auto-populated on sign-up via a database trigger |
| `stock_predictions` | Daily AI prediction cache — unique per `(symbol, prediction_date)` |
| `watchlists` | Per-user stock watchlist — unique per `(user_id, symbol)` |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Supabase anon/public key |
| `VITE_GEMINI_API_KEY` | ⬜ Optional | Google Gemini API key — enables AI predictions; falls back to technical analysis if absent |

---

## ▶️ Running the Project Locally

```bash
npm run dev        # Start dev server on http://localhost:8080
npm run build      # Production build → dist/
npm run preview    # Serve the production build locally
npm run lint       # Run ESLint
```

The Vite dev server proxies `/api/yahoo/*` → `https://query1.finance.yahoo.com/*` automatically — no Vercel account needed for local development.

---

## 🌐 Deployment

### Deploy to Vercel

1. Push the repository to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Confirm the build settings (Vercel detects these from `vercel.json` and `package.json`):
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. Add environment variables under **Project Settings → Environment Variables**:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon key |
   | `VITE_GEMINI_API_KEY` | _(optional)_ your Gemini key |

5. Click **Deploy**.

The file `api/yahoo.ts` is automatically compiled to a Vercel serverless function. All `/api/yahoo/*` requests are routed to it by the `vercel.json` rules; all other paths fall through to the SPA (`index.html`).

### Supabase auth redirect URL

After deploying, add your Vercel domain to Supabase:

1. **Dashboard → Authentication → URL Configuration**
2. **Site URL:** `https://your-app.vercel.app`
3. **Redirect URLs:** `https://your-app.vercel.app/**`

### Deploy via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 📂 API / Backend

### Vercel serverless proxy — `api/yahoo.ts`

Proxies all `/api/yahoo/*` requests to `https://query1.finance.yahoo.com/*`, preserving the full path and query string. Required in production because browsers cannot call Yahoo Finance directly due to CORS restrictions.

```
GET /api/yahoo/v8/finance/chart/AAPL?interval=1d&range=1d
→  https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d
```

### Supabase edge functions (optional alternative)

Two Deno-based edge functions are included for server-side execution — useful if you want API keys kept off the client entirely:

| Function | Path | Purpose |
|---|---|---|
| `stock-data` | `supabase/functions/stock-data/` | Yahoo Finance proxy (quote, historical, overview) |
| `gemini-stock-prediction` | `supabase/functions/gemini-stock-prediction/` | Gemini prediction with server-side `GEMINI_API_KEY` secret |

Deploy them with the Supabase CLI:

```bash
supabase login
supabase link --project-ref your-project-id
supabase secrets set GEMINI_API_KEY=your-key
supabase functions deploy stock-data
supabase functions deploy gemini-stock-prediction
```

> The app currently calls Yahoo Finance and Gemini from the browser (via the Vercel proxy). The edge functions are provided as a server-side alternative.

---

## 🤖 AI Prediction

### With Gemini 1.5 Flash (`VITE_GEMINI_API_KEY` set)

- Sends the stock symbol, current price, and up to 30 days of closing prices to `gemini-1.5-flash-latest`.
- Parses the JSON response for `{ price, confidence, reasoning }`.
- Confidence is clamped to the range **50–95 %**.
- Result is cached in Supabase `stock_predictions` for the current calendar day.

### Technical analysis fallback (no API key)

Used automatically when `VITE_GEMINI_API_KEY` is not set or Gemini returns an error.

| Signal | Method |
|---|---|
| Direction | 5-day MA vs 10-day MA crossover |
| Magnitude | Normalised linear trend slope over last 10 days |
| Momentum | 5-day price momentum |
| Volatility cap | `min(5%, log-return σ × 2)` |
| Confidence | 50–92 %, adjusted down by volatility |

---

## 📊 Stock Analysis

### Home page
Displays live quotes for AAPL, GOOGL, MSFT, AMZN, TSLA, META — with gainer/loser counts, average daily change, and an area chart for the first available symbol.

### Predict page
Enter any US stock ticker to fetch live price data, 30 days of historical closes, and generate a next-day prediction with confidence level and reasoning text. Includes quick-access buttons for AAPL, GOOGL, MSFT, AMZN, TSLA, META.

### Compare page
Add up to 5 tickers. Displays individual stock cards and a single normalised percentage-change line chart (Recharts) showing each stock's performance relative to its own starting price — making different-priced stocks directly comparable. Defaults to AAPL and GOOGL on load.

### Insights page
Fetches live data for AAPL, GOOGL, MSFT, AMZN and computes:
- **Overall market sentiment** (bullish / bearish)
- **Fear & greed index** (derived from average daily change, scaled 0–100)
- **Volatility classification** (Low / Medium / High)
- Per-stock sentiment, confidence score, risk level, and buy/sell/hold recommendation
- Up to 4 dynamic key insights (momentum, volatility alerts, top/worst performers)

---

## 👩‍💻 Author

**Vishakha Jagdish Jadhav**
Final Year B.Tech — Major Project 1

---

> **Disclaimer:** All predictions and market insights are generated algorithmically for educational purposes only. Nothing in this application constitutes financial advice. Always consult a qualified financial advisor before making investment decisions.
