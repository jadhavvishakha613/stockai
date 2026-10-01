# StockAI — AI-Powered Stock Market Predictions

A full-stack web application that provides real-time stock market data, AI-powered price predictions, multi-stock comparison, and market insights. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase authentication.

---

## Features

| Feature | Description |
|---|---|
| **Real-Time Stock Data** | Live quotes, daily change, high/low, and volume via Yahoo Finance (no API key required) |
| **AI Price Prediction** | Next-day price prediction using Google Gemini 1.5 Flash (falls back to technical analysis if no key is set) |
| **Stock Comparison** | Compare up to 5 stocks side-by-side with normalized performance charts (Recharts) |
| **Market Insights** | Dynamic AI-generated market sentiment, fear/greed index, and per-stock analysis |
| **Authentication** | Supabase email/password auth with sign up, sign in, and password reset |
| **Prediction Caching** | Supabase database caches predictions per symbol per day to avoid redundant AI calls |
| **Responsive UI** | Dark-mode-first, mobile-responsive layout using shadcn/ui + Tailwind CSS |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| Charts | Recharts 2 |
| Auth & DB | Supabase (PostgreSQL + Row Level Security) |
| AI | Google Gemini 1.5 Flash (optional) |
| Stock Data | Yahoo Finance v8 API (free, no key) |
| Routing | React Router DOM v6 |
| State | React Query v5 (TanStack) |
| Deployment | Vercel (serverless functions + static hosting) |

---

## Project Structure

```
stockai/
├── api/
│   └── yahoo/
│       └── [...path].ts        # Vercel serverless proxy for Yahoo Finance
├── src/
│   ├── components/
│   │   ├── Navigation.tsx       # Top nav with mobile menu
│   │   ├── ProtectedRoute.tsx   # Auth guard wrapper
│   │   ├── StockCard.tsx        # Individual stock display card
│   │   ├── StockChart.tsx       # Recharts area/line chart
│   │   ├── UserMenu.tsx         # User dropdown (sign out)
│   │   └── ui/                  # shadcn/ui component library
│   ├── contexts/
│   │   └── AuthContext.tsx      # Supabase auth state + methods
│   ├── hooks/
│   │   ├── useStockData.ts      # Yahoo Finance fetch hooks
│   │   └── useStockPrediction.ts # Gemini AI + technical analysis fallback
│   ├── integrations/supabase/
│   │   ├── client.ts            # Supabase client (reads from .env)
│   │   └── types.ts             # Generated TypeScript DB types
│   ├── pages/
│   │   ├── Auth.tsx             # Sign in / Sign up / Reset password
│   │   ├── Home.tsx             # Dashboard with market overview
│   │   ├── Predict.tsx          # AI stock prediction page
│   │   ├── Compare.tsx          # Multi-stock comparison
│   │   ├── Insights.tsx         # Market insights & recommendations
│   │   └── NotFound.tsx         # 404 page
│   ├── lib/utils.ts             # cn() tailwind helper
│   ├── App.tsx                  # Router setup
│   ├── main.tsx                 # React entry point
│   └── index.css                # Tailwind base + custom animations
├── supabase/
│   ├── config.toml              # Supabase project config
│   ├── migrations/
│   │   └── 20250101000000_initial_schema.sql  # DB schema
│   └── functions/
│       ├── stock-data/          # Edge function: Yahoo Finance proxy
│       └── gemini-stock-prediction/  # Edge function: Gemini prediction
├── .env.example                 # Environment variable template
├── vercel.json                  # Vercel deployment config + rewrites
├── vite.config.ts               # Vite config + dev proxy
├── tailwind.config.ts
└── package.json
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd stockai
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key

# Optional — enables Gemini AI predictions
# Get a free key at https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> **Never commit `.env`** — it is listed in `.gitignore`.

### 3. Set up Supabase database

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Navigate to **SQL Editor**
4. Paste and run the contents of [`supabase/migrations/20250101000000_initial_schema.sql`](supabase/migrations/20250101000000_initial_schema.sql)

This creates three tables with Row Level Security:
- `profiles` — user profiles (auto-populated on signup)
- `stock_predictions` — daily prediction cache
- `watchlists` — user stock watchlists

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

The Vite dev server proxies `/api/yahoo/*` → `https://query1.finance.yahoo.com/*` to bypass CORS.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Supabase anon/public key |
| `VITE_GEMINI_API_KEY` | ⬜ Optional | Google Gemini API key for AI predictions |

Without `VITE_GEMINI_API_KEY`, predictions fall back to a technical analysis algorithm (short/long MA crossover + momentum + linear trend).

---

## AI Prediction Details

When `VITE_GEMINI_API_KEY` is set:
- Calls **Gemini 1.5 Flash** directly from the browser
- Sends current price + last 30 days of historical prices
- Returns: predicted price, confidence %, and reasoning text
- Result is cached in Supabase for the current day (per symbol)

Without Gemini key (technical analysis fallback):
- Computes short MA (5-day) vs long MA (10-day) crossover
- Applies linear trend slope and recent momentum
- Caps price movement at `min(5%, volatility × 2)`
- Confidence range: 50–92%

---

## Deployment on Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- The project pushed to a GitHub/GitLab/Bitbucket repository

### Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects Vite — confirm settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables in **Project Settings → Environment Variables**:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `your-anon-key` |
   | `VITE_GEMINI_API_KEY` | _(optional)_ `your-gemini-key` |

5. Click **Deploy**

### Deploy via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
# Set env vars when prompted, or add them in the Vercel dashboard
```

### How the proxy works in production

In development, Vite's `server.proxy` rewrites `/api/yahoo/*` → `https://query1.finance.yahoo.com/*`.

In production on Vercel, the file `api/yahoo/[...path].ts` is compiled to a **serverless function** that performs the same proxy. The `vercel.json` rewrite rules ensure `/api/yahoo/*` requests are routed to this function.

### Supabase Auth redirect URL

After deploying, add your Vercel domain to Supabase:

1. **Supabase Dashboard → Authentication → URL Configuration**
2. Add to **Redirect URLs**: `https://your-app.vercel.app/**`
3. Set **Site URL**: `https://your-app.vercel.app`

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Supabase Edge Functions (Optional)

Two edge functions are included for server-side execution (e.g., if you want to keep API keys off the client):

- `supabase/functions/stock-data/` — Yahoo Finance proxy
- `supabase/functions/gemini-stock-prediction/` — Gemini prediction with server-side key

To deploy them:

```bash
supabase login
supabase link --project-ref your-project-id
supabase secrets set GEMINI_API_KEY=your-key
supabase functions deploy stock-data
supabase functions deploy gemini-stock-prediction
```

> The app currently calls Yahoo Finance and Gemini **directly from the browser** (using the Vercel proxy for Yahoo Finance). The edge functions are provided as an alternative for production environments that require server-side secrets management.

---

## License

MIT — see [LICENSE](LICENSE) for details.
