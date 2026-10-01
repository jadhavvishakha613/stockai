import { useState, useCallback } from 'react';

interface StockPrice {
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
  timestamp: number; // Unix ms — compatible with new Date(timestamp)
  price: number;
  volume: number;
}

// Yahoo Finance v8 chart API proxied through Vite (/api/yahoo → query1.finance.yahoo.com)
// This avoids CORS issues in both dev (Vite proxy) and production (same proxy config)
const YAHOO_BASE = '/api/yahoo/v8/finance/chart';

interface YahooResult {
  meta: {
    symbol?: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    chartPreviousClose?: number;
    regularMarketPreviousClose?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: number[];
      volume?: number[];
    }>;
  };
}

interface YahooResponse {
  chart?: {
    result?: YahooResult[];
    error?: { description?: string } | null;
  };
}

async function yahooFetch(url: string): Promise<YahooResult> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance request failed: HTTP ${res.status}`);
  }
  const json: YahooResponse = await res.json();
  if (json.chart?.error) {
    throw new Error(json.chart.error.description || 'Yahoo Finance error');
  }
  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error('No data returned from Yahoo Finance');
  }
  return result;
}

async function fetchYahooQuote(symbol: string): Promise<StockPrice> {
  const result = await yahooFetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`);
  const meta = result.meta;

  const price: number = meta.regularMarketPrice ?? 0;
  const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price;
  const change: number = price - prevClose;
  const changePercent: number = prevClose !== 0 ? (change / prevClose) * 100 : 0;

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
    .map((ts, i) => ({
      timestamp: ts * 1000, // convert seconds → milliseconds
      price: closes[i] ?? 0,
      volume: volumes[i] ?? 0,
    }))
    .filter(point => point.price > 0); // drop null/zero entries
}

export const useStockData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockPrice = useCallback(async (symbol: string): Promise<StockPrice | null> => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchYahooQuote(symbol);
      return data;
    } catch (err: unknown) {
      console.error('Stock price fetch error:', err);
      const msg = err instanceof Error ? err.message : `Failed to fetch data for ${symbol}`;
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStockChart = useCallback(async (symbol: string): Promise<StockChart[]> => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchYahooHistorical(symbol);
      return data;
    } catch (err: unknown) {
      console.error('Chart data fetch error:', err);
      const msg = err instanceof Error ? err.message : `Failed to fetch chart data for ${symbol}`;
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMarketOverview = useCallback(async (symbols: string[]): Promise<StockPrice[]> => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all symbols in parallel; failed ones return null and are filtered out
      const results = await Promise.allSettled(symbols.map(s => fetchYahooQuote(s)));
      return results
        .filter((r): r is PromiseFulfilledResult<StockPrice> => r.status === 'fulfilled')
        .map(r => r.value);
    } catch (err: unknown) {
      console.error('Market overview fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchStockPrice,
    fetchStockChart,
    fetchMarketOverview,
    loading,
    error,
  };
};
