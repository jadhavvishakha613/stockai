import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Gemini-powered stock prediction edge function.
// Deploy via Supabase Dashboard → Edge Functions → New Function.
// Set GEMINI_API_KEY as a project secret in Dashboard → Settings → Secrets.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, currentPrice, historicalData } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY secret not configured');

    // Fetch fresh market data from Yahoo Finance (no API key required)
    const meta = await getYahooMeta(symbol);
    const price: number = meta.regularMarketPrice ?? currentPrice;
    const prevClose: number = meta.chartPreviousClose ?? price;
    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    const prompt = `You are a professional stock market analyst. Analyze the following data for ${symbol} and provide a price prediction for the next trading day.

Current Market Data:
- Current Price: $${price.toFixed(2)}
- Symbol: ${symbol}
- Daily Change: ${changePercent.toFixed(2)}%
- Volume: ${meta.regularMarketVolume ?? 0}

Historical Prices (last ${(historicalData as number[]).length} trading days, oldest first): [${(historicalData as number[]).slice(-30).map((p: number) => p.toFixed(2)).join(', ')}]

Based on this data, provide:
1. A predicted price for tomorrow (be realistic, typically within ±5% of current price)
2. Confidence level as a number between 50 and 95
3. Brief reasoning (2-3 sentences)

Respond ONLY in valid JSON format, no markdown, no extra text:
{"price": number, "confidence": number, "reasoning": "string"}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message || `Gemini HTTP ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini returned unparseable response');

    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({
      price: result.price,
      confidence: Math.max(50, Math.min(95, result.confidence)),
      reasoning: result.reasoning ?? '',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('gemini-stock-prediction error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function getYahooMeta(symbol: string): Promise<any> {
  try {
    const res = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta ?? {};
  } catch {
    return {};
  }
}
