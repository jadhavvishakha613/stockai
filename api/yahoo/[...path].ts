/**
 * Vercel serverless function: proxy for Yahoo Finance v8 chart API.
 * Handles all requests matching /api/yahoo/* and forwards them to
 * https://query1.finance.yahoo.com/*
 *
 * This is required in production (Vercel) because the browser cannot call
 * Yahoo Finance directly due to CORS restrictions. In development, Vite's
 * server.proxy handles the same /api/yahoo → Yahoo Finance rewrite.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract the path segments after /api/yahoo/
  const pathParam = req.query.path;
  const segments = Array.isArray(pathParam) ? pathParam.join('/') : pathParam ?? '';

  // Reconstruct query string (everything after ?)
  const { path: _path, ...rest } = req.query;
  const qs = new URLSearchParams(
    Object.entries(rest).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map(val => [k, val]) : [[k, v ?? '']]
    )
  ).toString();

  const targetUrl = `https://query1.finance.yahoo.com/${segments}${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockAI/1.0)',
        'Accept': 'application/json',
      },
    });

    const body = await upstream.text();

    // Pass through status and content-type
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    // Allow browsers to read the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upstream request failed';
    res.status(502).json({ error: msg });
  }
}
