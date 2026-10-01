import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Yahoo Finance v8 chart API — no API key required
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: number;
}

interface StockChart {
  timestamp: number;
  price: number;
  volume: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol, symbols } = await req.json();

    if (action === 'quote') {
      const data = await fetchYahooQuote(symbol);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'historical') {
      const data = await fetchYahooHistorical(symbol);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'overview') {
      const results = await Promise.allSettled(
        (symbols as string[]).map((s: string) => fetchYahooQuote(s))
      );
      const data = results
        .filter((r): r is PromiseFulfilledResult<StockData> => r.status === 'fulfilled')
        .map(r => r.value);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action specified');
  } catch (error: any) {
    console.error('Stock data API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function yahooFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
  const json = await res.json();
  if (json.chart?.error) throw new Error(json.chart.error.description || 'Yahoo Finance error');
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No data returned');
  return result;
}

async function fetchYahooQuote(symbol: string): Promise<StockData> {
  const result = await yahooFetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`);
  const meta = result.meta;
  const price: number = meta.regularMarketPrice ?? 0;
  const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    change,
    changePercent,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
    volume: meta.regularMarketVolume ?? 0,
  };
}

async function fetchYahooHistorical(symbol: string): Promise<StockChart[]> {
  const result = await yahooFetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1mo`);
  const timestamps: number[] = result.timestamp ?? [];
  const quotes = result.indicators?.quote?.[0] ?? {};
  const closes: number[] = quotes.close ?? [];
  const volumes: number[] = quotes.volume ?? [];
  return timestamps
    .map((ts: number, i: number) => ({
      timestamp: ts * 1000,
      price: closes[i] ?? 0,
      volume: volumes[i] ?? 0,
    }))
    .filter((p: StockChart) => p.price > 0);
}
