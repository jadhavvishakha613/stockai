/**
 * Vercel serverless function: proxy for Yahoo Finance API.
 * Handles all requests matching /api/yahoo/* and forwards them to
 * https://query1.finance.yahoo.com/*
 *
 * This is required in production (Vercel) because the browser cannot call
 * Yahoo Finance directly due to CORS restrictions. In development, Vite's
 * server.proxy handles the same /api/yahoo → Yahoo Finance rewrite.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // req.url is the full incoming URL, e.g. /api/yahoo/v8/finance/chart/AAPL?interval=1d&range=1d
  // Strip the /api/yahoo prefix to get the path+query to forward upstream.
  const url = req.url ?? '';
  const rest = url.replace(/^\/api\/yahoo/, '');

  const targetUrl = `https://query1.finance.yahoo.com${rest}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockAI/1.0)',
        'Accept': 'application/json',
      },
    });

    const body = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upstream request failed';
    res.status(502).json({ error: msg });
  }
}
