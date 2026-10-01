import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PredictionResult {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  predictionDate: string;
  reasoning?: string;
}

// ─── Technical analysis helpers ───────────────────────────────────────────────

function movingAverage(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdDev(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(data.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / data.length);
}

function linearTrendSlope(data: number[]): number {
  const n = data.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * data[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope / (sumY / n); // normalised
}

/**
 * Technical-analysis–based prediction used when no Gemini API key is configured.
 * Uses: short/long MA crossover, momentum, linear trend, and volatility.
 */
function technicalPrediction(
  currentPrice: number,
  historicalPrices: number[],
): { price: number; confidence: number; reasoning: string } {
  if (historicalPrices.length < 5) {
    return {
      price: currentPrice * (1 + (Math.random() - 0.5) * 0.02),
      confidence: 60,
      reasoning: 'Insufficient historical data — minimal price movement predicted.',
    };
  }

  const shortMA = movingAverage(historicalPrices, Math.min(5, historicalPrices.length));
  const longMA  = movingAverage(historicalPrices, Math.min(10, historicalPrices.length));
  const returns = historicalPrices.slice(1).map((p, i) => Math.log(p / historicalPrices[i]));
  const volatility = stdDev(returns);
  const trend  = linearTrendSlope(historicalPrices.slice(-10));
  const recent = historicalPrices[Math.max(0, historicalPrices.length - 5)];
  const momentum = (currentPrice - recent) / recent;

  let factor = 0;
  let confidence = 70;
  const bullish = shortMA > longMA;

  factor += bullish ? 0.01 : -0.01;
  confidence += 5;
  factor += trend * 0.5;
  factor += momentum * 0.3;

  const maxChange = Math.min(0.05, volatility * 2);
  factor = Math.max(-maxChange, Math.min(maxChange, factor));
  confidence = Math.max(50, Math.min(92, confidence - volatility * 100));

  const reasoning = bullish
    ? `Short-term MA above long-term MA suggests upward momentum. Trend factor: ${(trend * 100).toFixed(2)}%. Volatility: ${(volatility * 100).toFixed(2)}%.`
    : `Short-term MA below long-term MA indicates potential downside. Trend factor: ${(trend * 100).toFixed(2)}%. Volatility: ${(volatility * 100).toFixed(2)}%.`;

  return {
    price: currentPrice * (1 + factor),
    confidence: Math.round(confidence),
    reasoning,
  };
}

// ─── Gemini AI prediction ──────────────────────────────────────────────────────

/**
 * Calls the Gemini API directly from the browser.
 * Requires VITE_GEMINI_API_KEY in .env
 * Get a free key at: https://aistudio.google.com/app/apikey
 */
async function geminiPrediction(
  symbol: string,
  currentPrice: number,
  historicalPrices: number[],
): Promise<{ price: number; confidence: number; reasoning: string }> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim();
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  const prompt = `You are a professional stock market analyst. Analyze the following data for ${symbol} and provide a price prediction for the next trading day.

Current Market Data:
- Current Price: $${currentPrice.toFixed(2)}
- Symbol: ${symbol}

Historical Prices (last ${historicalPrices.length} trading days, oldest first): [${historicalPrices.slice(-30).map(p => p.toFixed(2)).join(', ')}]

Based on this data, provide:
1. A predicted price for tomorrow (be realistic, typically within ±5% of current price)
2. Confidence level as a number between 50 and 95
3. Brief reasoning (2-3 sentences)

Respond ONLY in valid JSON format, no markdown, no extra text:
{"price": number, "confidence": number, "reasoning": "string"}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = err?.error?.message || `Gemini HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Extract JSON — Gemini sometimes wraps in markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned unparseable response');

  const result = JSON.parse(jsonMatch[0]);
  if (typeof result.price !== 'number' || typeof result.confidence !== 'number') {
    throw new Error('Gemini response missing required fields');
  }

  return {
    price: result.price,
    confidence: Math.max(50, Math.min(95, result.confidence)),
    reasoning: result.reasoning ?? '',
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useStockPrediction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePrediction = useCallback(async (
    symbol: string,
    currentPrice: number,
    historicalData: number[],
  ): Promise<PredictionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      let aiResult: { price: number; confidence: number; reasoning: string };

      try {
        // Try Gemini first (requires VITE_GEMINI_API_KEY)
        aiResult = await geminiPrediction(symbol, currentPrice, historicalData);
      } catch (geminiErr: unknown) {
        const geminiMsg = geminiErr instanceof Error ? geminiErr.message : '';
        if (geminiMsg !== 'NO_GEMINI_KEY') {
          // Real Gemini error (bad key, quota, etc.) — log and fall through
          console.warn('Gemini prediction failed, using technical analysis:', geminiMsg);
        }
        // Fall back to technical analysis
        aiResult = technicalPrediction(currentPrice, historicalData);
      }

      const today = new Date().toISOString().split('T')[0];

      const predictionData = {
        symbol: symbol.toUpperCase(),
        current_price: currentPrice,
        predicted_price: aiResult.price,
        confidence: aiResult.confidence,
        prediction_date: today,
      };

      // Cache in Supabase (best-effort — failure does not block the result)
      supabase
        .from('stock_predictions')
        .upsert(predictionData, { onConflict: 'symbol,prediction_date' })
        .then(({ error: dbError }) => {
          if (dbError) console.warn('Cache write failed (non-fatal):', dbError.message);
        });

      return {
        symbol: predictionData.symbol,
        currentPrice: predictionData.current_price,
        predictedPrice: predictionData.predicted_price,
        confidence: predictionData.confidence,
        predictionDate: predictionData.prediction_date,
        reasoning: aiResult.reasoning,
      };
    } catch (err: unknown) {
      console.error('Prediction error:', err);
      setError('Failed to generate prediction. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCachedPrediction = useCallback(async (symbol: string): Promise<PredictionResult | null> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('stock_predictions')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('prediction_date', today)
        .maybeSingle();

      if (error) {
        console.warn('Cache read failed (non-fatal):', error.message);
        return null;
      }
      if (!data) return null;

      return {
        symbol: data.symbol,
        currentPrice: parseFloat(data.current_price?.toString() ?? '0'),
        predictedPrice: parseFloat(data.predicted_price?.toString() ?? '0'),
        confidence: parseFloat(data.confidence?.toString() ?? '0'),
        predictionDate: data.prediction_date,
      };
    } catch (err) {
      console.warn('Cache read error (non-fatal):', err);
      return null;
    }
  }, []);

  return { generatePrediction, getCachedPrediction, loading, error };
};
