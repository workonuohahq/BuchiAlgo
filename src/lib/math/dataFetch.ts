// ============================================================
// DATA INGESTION MODULE
// Fetches OHLCV data from exchanges via CCXT
// ============================================================

import ccxt from "ccxt";
import type { OHLCV } from "./types";

// Rate limiting: max requests per second per exchange
const rateLimits: Record<string, number> = {
  binance: 10,
  bybit: 8,
  okx: 8,
  kucoin: 6,
};

const lastRequestTime: Record<string, number> = {};

async function rateLimit(exchangeId: string): Promise<void> {
  const limit = rateLimits[exchangeId] || 5;
  const intervalMs = 1000 / limit;
  const now = Date.now();
  const last = lastRequestTime[exchangeId] || 0;
  const wait = Math.max(0, intervalMs - (now - last));
  
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastRequestTime[exchangeId] = Date.now();
}

export async function fetchOHLCV(
  exchangeId: string,
  symbol: string,
  timeframe: string = "1h",
  limit: number = 200
): Promise<OHLCV[]> {
  await rateLimit(exchangeId);

  const exchangeClass = (ccxt as any)[exchangeId];
  if (!exchangeClass) {
    throw new Error(`Exchange "${exchangeId}" not supported by CCXT`);
  }

  const exchange = new exchangeClass({
    enableRateLimit: true,
  });

  // Try to load markets
  try {
    await exchange.loadMarkets();
  } catch {
    // Continue even if market load fails — some exchanges work without it
  }

  // Normalize symbol format
  const normalizedSymbol = symbol.includes("/") ? symbol : symbol.replace(/(USDT|USD)$/i, "/$1");
  
  // Fetch OHLCV
  const rawOHLCV = await exchange.fetchOHLCV(normalizedSymbol, timeframe, undefined, limit);

  if (!Array.isArray(rawOHLCV) || rawOHLCV.length === 0) {
    throw new Error(`No OHLCV data returned for ${normalizedSymbol} on ${exchangeId}`);
  }

  return rawOHLCV.map((candle: number[]) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5] || 0,
  }));
}

export async function fetchWithFallback(
  symbol: string,
  exchangeId: string,
  timeframe: string = "1h",
  limit: number = 200
): Promise<{ candles: OHLCV[]; source: string }> {
  const exchanges = [exchangeId, "binance", "bybit", "okx"].filter(
    (e, i, arr) => arr.indexOf(e) === i
  );

  for (const ex of exchanges) {
    try {
      const candles = await fetchOHLCV(ex, symbol, timeframe, limit);
      if (candles.length >= 50) {
        return { candles, source: ex };
      }
    } catch (err) {
      console.warn(`Failed to fetch from ${ex}:`, (err as Error).message);
      continue;
    }
  }

  throw new Error(`Failed to fetch OHLCV data from all exchanges for ${symbol}`);
}

// Timeframe normalization
export const TIMEFRAME_MAP: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "12h": "12h",
  "1d": "1d",
  "3d": "3d",
  "1w": "1w",
};

export function normalizeTimeframe(tf: string): string {
  return TIMEFRAME_MAP[tf.toLowerCase()] || "1h";
}
