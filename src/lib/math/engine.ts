// ============================================================
// DETERMINISTIC QUANTITATIVE MATH ENGINE
// Pure mathematical analysis — ZERO AI / ZERO ML models
// All calculations are deterministic formulas on OHLCV arrays
// ============================================================

import type {
  OHLCV,
  MathParameters,
  FVGZone,
  SwingPoint,
  OrderBlock,
  MarketStructureShift,
  OIEResult,
  FullAnalysisResult,
  ExtractedSymbol,
} from "./types";

// ============================================================
// DEFAULT MATH PARAMETERS (overridden by system_config)
// ============================================================
export const DEFAULT_PARAMS: MathParameters = {
  lookback_period: 200,
  swing_lookback: 5,
  fvg_min_size_pct: 0.15,
  fvg_max_age_candles: 50,
  ob_volume_multiplier: 1.5,
  ob_lookback: 3,
  atr_multiplier_sl: 1.5,
  atr_multiplier_tp1: 2.0,
  atr_multiplier_tp2: 3.5,
  atr_multiplier_tp3: 5.0,
  mss_breakout_threshold: 0.5,
  volume_ma_period: 20,
  enable_fvg: true,
  enable_ifvg: true,
  enable_ob: true,
  enable_mss: true,
  quarter_rounding_precision: 2,
  min_candles_required: 50,
};

// ============================================================
// SYMBOL EXTRACTION — TradingView link parser
// ============================================================
export function extractSymbolFromUrl(url: string): ExtractedSymbol | null {
  // Pattern: tradingview.com/chart/?symbol=EXCHANGE:SYMBOL
  const tvPattern = /symbol=([^&\s]+)/i;
  const tvMatch = url.match(tvPattern);
  if (tvMatch) {
    const parts = tvMatch[1].split(":");
    if (parts.length === 2) {
      return { exchange: parts[0].toUpperCase(), symbol: parts[1].toUpperCase(), raw: tvMatch[1] };
    }
    return { exchange: "UNKNOWN", symbol: parts[0].toUpperCase(), raw: tvMatch[1] };
  }

  // Pattern: BINANCE:BTCUSDT direct
  const directPattern = /^([A-Z]+):([A-Z0-9]+)$/;
  const directMatch = url.match(directPattern);
  if (directMatch) {
    return { exchange: directMatch[1], symbol: directMatch[2], raw: url };
  }

  // Pattern: BTCUSDT standalone — try common exchange mapping
  const standalonePattern = /^([A-Z]{2,10})(USDT|USD|BUSD|USDC)$/i;
  const standaloneMatch = url.match(standalonePattern);
  if (standaloneMatch) {
    return { exchange: "BINANCE", symbol: url.toUpperCase(), raw: url.toUpperCase() };
  }

  return null;
}

export function getCcxtExchangeId(exchange: string): string {
  const mapping: Record<string, string> = {
    BINANCE: "binance",
    BYBIT: "bybit",
    OKX: "okx",
    KUCOIN: "kucoin",
    COINBASE: "coinbase",
    KRAKEN: "kraken",
    FOREXCOM: "oanda",
    OANDA: "oanda",
  };
  return mapping[exchange.toUpperCase()] || "binance";
}

// ============================================================
// CORE MATH UTILITIES
// ============================================================

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  return sum(arr) / arr.length;
}

function stdDev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(sum(arr.map((v) => (v - m) ** 2)) / arr.length);
}

// ============================================================
// ATR (Average True Range) — Volatility measurement
// ============================================================
export function calculateATR(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  return mean(trueRanges.slice(-period));
}

// ============================================================
// VOLUME MOVING AVERAGE
// ============================================================
export function calculateVolumeMA(candles: OHLCV[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1]?.volume || 0;
  const volumes = candles.slice(-period).map((c) => c.volume);
  return mean(volumes);
}

// ============================================================
// SWING HIGH / LOW DETECTION
// Uses structural lookback — deterministic fractal detection
// ============================================================
export function detectSwingPoints(
  candles: OHLCV[],
  lookback: number
): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high >= currentHigh) {
        isSwingHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low <= currentLow) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      highs.push({ index: i, price: currentHigh, type: "high" });
    }
    if (isSwingLow) {
      lows.push({ index: i, price: currentLow, type: "low" });
    }
  }

  return { highs, lows };
}

// ============================================================
// FVG (Fair Value Gap) DETECTION
// 3-candle sequence: Candle 1 High < Candle 3 Low (bullish)
//                    Candle 1 Low > Candle 3 High (bearish)
// ============================================================
export function detectFVGs(
  candles: OHLCV[],
  params: MathParameters,
  inverse: boolean = false
): FVGZone[] {
  const zones: FVGZone[] = [];
  const minSizePct = params.fvg_min_size_pct;
  const maxAge = params.fvg_max_age_candles;
  const lastIndex = candles.length - 1;

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    let zone: FVGZone | null = null;

    if (!inverse) {
      // Standard FVG
      // Bullish: C1 High < C3 Low (gap UP)
      if (c1.high < c3.low) {
        const size = c3.low - c1.high;
        const sizePct = (size / c1.close) * 100;
        const midpoint = (c1.high + c3.low) / 2;

        if (sizePct >= minSizePct) {
          zone = {
            type: "bullish",
            startIndex: i - 2,
            endIndex: i,
            top: c3.low,
            bottom: c1.high,
            size,
            sizePct,
            midpoint,
            oiePrice: roundToQuarter(midpoint, params.quarter_rounding_precision),
            isInverse: false,
            age: lastIndex - i,
            volumeAtFormation: c2.volume,
          };
        }
      }
      // Bearish: C1 Low > C3 High (gap DOWN)
      else if (c1.low > c3.high) {
        const size = c1.low - c3.high;
        const sizePct = (size / c1.close) * 100;
        const midpoint = (c3.high + c1.low) / 2;

        if (sizePct >= minSizePct) {
          zone = {
            type: "bearish",
            startIndex: i - 2,
            endIndex: i,
            top: c1.low,
            bottom: c3.high,
            size,
            sizePct,
            midpoint,
            oiePrice: roundToQuarter(midpoint, params.quarter_rounding_precision),
            isInverse: false,
            age: lastIndex - i,
            volumeAtFormation: c2.volume,
          };
        }
      }
    } else {
      // Inverse FVG (IFVG) — price has returned to fill the gap
      // Bullish IFVG: Was a bearish gap, now being filled from below
      const prevCandles = candles.slice(0, i);
      const nearbyFVGs = detectFVGs(prevCandles, { ...params, fvg_max_age_candles: maxAge * 2 }, false);
      
      for (const fvg of nearbyFVGs) {
        if (fvg.type === "bearish" && fvg.age <= maxAge * 2) {
          // Check if price is now inside the FVG zone
          if (c3.low <= fvg.top && c3.high >= fvg.bottom) {
            const filledPct = Math.min(100, ((c3.high - fvg.bottom) / (fvg.top - fvg.bottom)) * 100);
            if (filledPct >= 30 && filledPct <= 85) {
              zone = {
                ...fvg,
                isInverse: true,
                age: lastIndex - fvg.endIndex,
                volumeAtFormation: c3.volume,
              };
            }
          }
        }
        if (fvg.type === "bullish" && fvg.age <= maxAge * 2) {
          if (c3.high >= fvg.bottom && c3.low <= fvg.top) {
            const filledPct = Math.min(100, ((fvg.top - c3.low) / (fvg.top - fvg.bottom)) * 100);
            if (filledPct >= 30 && filledPct <= 85) {
              zone = {
                ...fvg,
                isInverse: true,
                age: lastIndex - fvg.endIndex,
                volumeAtFormation: c3.volume,
              };
            }
          }
        }
      }
    }

    if (zone && zone.age <= maxAge) {
      // Avoid duplicates
      const exists = zones.find(
        (z) => z.startIndex === zone!.startIndex && z.type === zone!.type
      );
      if (!exists) {
        zones.push(zone);
      }
    }
  }

  return zones.sort((a, b) => a.age - b.age);
}

// ============================================================
// MARKET STRUCTURE SHIFT (MSS) DETECTION
// Price breaks a significant swing high/low with volume
// ============================================================
export function detectMarketStructureShifts(
  candles: OHLCV[],
  swings: { highs: SwingPoint[]; lows: SwingPoint[] },
  params: MathParameters
): MarketStructureShift[] {
  const shifts: MarketStructureShift[] = [];
  const { highs, lows } = swings;
  const threshold = params.mss_breakout_threshold / 100; // Convert to decimal

  for (let i = 1; i < highs.length; i++) {
    const prevSwing = highs[i - 1];
    const currentSwing = highs[i];
    
    // Check candles between swings for breakout above previous high
    if (currentSwing.index > prevSwing.index) {
      const breakThreshold = prevSwing.price * (1 + threshold);
      const candlesBetween = candles.slice(prevSwing.index, currentSwing.index);
      
      for (let j = 0; j < candlesBetween.length; j++) {
        const c = candlesBetween[j];
        if (c.close > breakThreshold) {
          const avgVolume = calculateVolumeMA(
            candles.slice(Math.max(0, prevSwing.index - params.volume_ma_period), prevSwing.index),
            params.volume_ma_period
          );
          if (avgVolume > 0 && c.volume > avgVolume) {
            shifts.push({
              type: "bullish",
              breakIndex: prevSwing.index + j,
              breakPrice: c.close,
              previousSwing: prevSwing,
              confirmingVolume: c.volume,
            });
            break;
          }
        }
      }
    }
  }

  for (let i = 1; i < lows.length; i++) {
    const prevSwing = lows[i - 1];
    const currentSwing = lows[i];
    
    if (currentSwing.index > prevSwing.index) {
      const breakThreshold = prevSwing.price * (1 - threshold);
      const candlesBetween = candles.slice(prevSwing.index, currentSwing.index);
      
      for (let j = 0; j < candlesBetween.length; j++) {
        const c = candlesBetween[j];
        if (c.close < breakThreshold) {
          const avgVolume = calculateVolumeMA(
            candles.slice(Math.max(0, prevSwing.index - params.volume_ma_period), prevSwing.index),
            params.volume_ma_period
          );
          if (avgVolume > 0 && c.volume > avgVolume) {
            shifts.push({
              type: "bearish",
              breakIndex: prevSwing.index + j,
              breakPrice: c.close,
              previousSwing: prevSwing,
              confirmingVolume: c.volume,
            });
            break;
          }
        }
      }
    }
  }

  return shifts;
}

// ============================================================
// ORDER BLOCK (OB) DETECTION
// Last opposing candle before a structural breakout + volume surge
// ============================================================
export function detectOrderBlocks(
  candles: OHLCV[],
  swings: { highs: SwingPoint[]; lows: SwingPoint[] },
  shifts: MarketStructureShift[],
  params: MathParameters
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  const volumeMA = calculateVolumeMA(candles, params.volume_ma_period);

  for (const shift of shifts) {
    const lookbackStart = Math.max(0, shift.breakIndex - params.ob_lookback);
    const lookbackCandles = candles.slice(lookbackStart, shift.breakIndex);

    if (lookbackCandles.length === 0) continue;

    if (shift.type === "bullish") {
      // Bullish MSS — find the last bearish (down) candle before breakout
      let lastBearishCandle: { candle: OHLCV; index: number } | null = null;
      
      for (let i = lookbackCandles.length - 1; i >= 0; i--) {
        const c = lookbackCandles[i];
        if (c.close < c.open) {
          lastBearishCandle = { candle: c, index: lookbackStart + i };
          break;
        }
      }

      if (lastBearishCandle && lastBearishCandle.candle.volume > volumeMA * params.ob_volume_multiplier) {
        const c = lastBearishCandle.candle;
        const midpoint = (c.high + c.low) / 2;
        
        orderBlocks.push({
          type: "bullish",
          index: lastBearishCandle.index,
          top: c.high,
          bottom: c.low,
          volume: c.volume,
          avgVolume: volumeMA,
          volumeRatio: c.volume / volumeMA,
          midpoint,
          oiePrice: roundToQuarter(midpoint, params.quarter_rounding_precision),
          orderBlockCandle: c,
        });
      }
    } else {
      // Bearish MSS — find the last bullish (up) candle before breakout
      let lastBullishCandle: { candle: OHLCV; index: number } | null = null;
      
      for (let i = lookbackCandles.length - 1; i >= 0; i--) {
        const c = lookbackCandles[i];
        if (c.close > c.open) {
          lastBullishCandle = { candle: c, index: lookbackStart + i };
          break;
        }
      }

      if (lastBullishCandle && lastBullishCandle.candle.volume > volumeMA * params.ob_volume_multiplier) {
        const c = lastBullishCandle.candle;
        const midpoint = (c.high + c.low) / 2;
        
        orderBlocks.push({
          type: "bearish",
          index: lastBullishCandle.index,
          top: c.high,
          bottom: c.low,
          volume: c.volume,
          avgVolume: volumeMA,
          volumeRatio: c.volume / volumeMA,
          midpoint,
          oiePrice: roundToQuarter(midpoint, params.quarter_rounding_precision),
          orderBlockCandle: c,
        });
      }
    }
  }

  return orderBlocks;
}

// ============================================================
// OIE (OPTIMAL INSTITUTIONAL ENTRY) CALCULATION
// Quarter-rounding: snap to .00, .25, .50, .75
// ============================================================
export function roundToQuarter(price: number, precision: number = 2): number {
  const multiplier = Math.pow(10, precision);
  const scaled = price * multiplier;
  const quarter = Math.round(scaled / 25) * 25;
  return quarter / multiplier;
}

export function calculateOIE(
  zone: FVGZone | OrderBlock,
  candles: OHLCV[],
  params: MathParameters
): OIEResult {
  const atr = calculateATR(candles, 14);
  const currentPrice = candles[candles.length - 1].close;
  const isBullish = zone.type === "bullish";

  const entryTop = zone.top;
  const entryBottom = zone.bottom;
  const entryMid = zone.oiePrice;

  // Stop Loss: ATR-based beyond the zone
  const sl = isBullish
    ? entryBottom - atr * params.atr_multiplier_sl
    : entryTop + atr * params.atr_multiplier_sl;

  // Take Profits: ATR-based projections
  const tp1 = isBullish
    ? entryMid + atr * params.atr_multiplier_tp1
    : entryMid - atr * params.atr_multiplier_tp1;
  const tp2 = isBullish
    ? entryMid + atr * params.atr_multiplier_tp2
    : entryMid - atr * params.atr_multiplier_tp2;
  const tp3 = isBullish
    ? entryMid + atr * params.atr_multiplier_tp3
    : entryMid - atr * params.atr_multiplier_tp3;

  const risk = Math.abs(entryMid - sl);
  const rr1 = risk > 0 ? Math.abs(tp1 - entryMid) / risk : 0;
  const rr2 = risk > 0 ? Math.abs(tp2 - entryMid) / risk : 0;
  const rr3 = risk > 0 ? Math.abs(tp3 - entryMid) / risk : 0;

  // Confidence score based on zone quality
  let confidence = 50;
  if ("sizePct" in zone) {
    confidence += Math.min(25, zone.sizePct * 2); // FVG size bonus
  }
  if ("volumeRatio" in zone) {
    confidence += Math.min(15, (zone.volumeRatio - 1) * 10); // Volume bonus
  }
  confidence = Math.min(98, Math.max(20, confidence));

  // Recommended leverage (conservative)
  const volatilityScore = atr / currentPrice;
  const recommendedLeverage = volatilityScore > 0.02 ? 5 : volatilityScore > 0.01 ? 10 : 20;

  return {
    price: entryMid,
    entryZone: { top: entryTop, bottom: entryBottom },
    stopLoss: roundToQuarter(sl, params.quarter_rounding_precision),
    takeProfits: {
      tp1: roundToQuarter(tp1, params.quarter_rounding_precision),
      tp2: roundToQuarter(tp2, params.quarter_rounding_precision),
      tp3: roundToQuarter(tp3, params.quarter_rounding_precision),
    },
    riskRewardRatios: {
      rr1: Math.round(rr1 * 10) / 10,
      rr2: Math.round(rr2 * 10) / 10,
      rr3: Math.round(rr3 * 10) / 10,
    },
    atr: Math.round(atr * 100000) / 100000,
    confidence,
    zoneType: "sizePct" in zone ? (zone.isInverse ? "IFVG" : "FVG") : "OB",
    zoneIndex: (zone as any).index || (zone as any).startIndex || 0,
  };
}

// ============================================================
// TREND DETERMINATION
// Simple structure-based trend using swing points
// ============================================================
export function determineTrend(
  candles: OHLCV[],
  swings: { highs: SwingPoint[]; lows: SwingPoint[] }
): "bullish" | "bearish" | "neutral" {
  const { highs, lows } = swings;
  if (highs.length < 2 || lows.length < 2) return "neutral";

  const lastTwoHighs = highs.slice(-2);
  const lastTwoLows = lows.slice(-2);

  const higherHigh = lastTwoHighs[1].price > lastTwoHighs[0].price;
  const higherLow = lastTwoLows[1].price > lastTwoLows[0].price;
  const lowerHigh = lastTwoHighs[1].price < lastTwoHighs[0].price;
  const lowerLow = lastTwoLows[1].price < lastTwoLows[0].price;

  if (higherHigh && higherLow) return "bullish";
  if (lowerHigh && lowerLow) return "bearish";
  return "neutral";
}

// ============================================================
// FULL ANALYSIS PIPELINE
// Orchestrates all deterministic calculations
// ============================================================
export function runFullAnalysis(
  candles: OHLCV[],
  symbol: string,
  exchange: string,
  timeframe: string,
  params: MathParameters = DEFAULT_PARAMS
): FullAnalysisResult {
  if (candles.length < params.min_candles_required) {
    throw new Error(
      `Insufficient candle data. Required: ${params.min_candles_required}, Got: ${candles.length}`
    );
  }

  const currentPrice = candles[candles.length - 1].close;

  // Step 1: Detect swing points
  const swings = detectSwingPoints(candles, params.swing_lookback);

  // Step 2: Detect trend
  const currentTrend = determineTrend(candles, swings);

  // Step 3: Detect FVGs
  let fvgs: FVGZone[] = [];
  if (params.enable_fvg) {
    fvgs = detectFVGs(candles, params, false);
  }

  // Step 4: Detect Inverse FVGs
  let inverseFvgs: FVGZone[] = [];
  if (params.enable_ifvg) {
    inverseFvgs = detectFVGs(candles, params, true);
  }

  // Step 5: Detect Market Structure Shifts
  let structureShifts: MarketStructureShift[] = [];
  if (params.enable_mss) {
    structureShifts = detectMarketStructureShifts(candles, swings, params);
  }

  // Step 6: Detect Order Blocks
  let orderBlocks: OrderBlock[] = [];
  if (params.enable_ob && structureShifts.length > 0) {
    orderBlocks = detectOrderBlocks(candles, swings, structureShifts, params);
  }

  // Step 7: Calculate OIE for all zones
  const oieResults: OIEResult[] = [];

  // OIE for FVGs
  for (const fvg of fvgs) {
    if (!fvg.isInverse) {
      oieResults.push(calculateOIE(fvg, candles, params));
    }
  }

  // OIE for Inverse FVGs
  for (const ifvg of inverseFvgs) {
    oieResults.push(calculateOIE(ifvg, candles, params));
  }

  // OIE for Order Blocks
  for (const ob of orderBlocks) {
    oieResults.push(calculateOIE(ob, candles, params));
  }

  // Sort by confidence descending
  oieResults.sort((a, b) => b.confidence - a.confidence);

  // Volume profile
  const currentVolume = candles[candles.length - 1].volume;
  const volumeAvg = calculateVolumeMA(candles, params.volume_ma_period);

  return {
    symbol,
    exchange,
    timeframe,
    timestamp: Date.now(),
    currentPrice,
    currentTrend,
    fvgs,
    inverseFvgs,
    orderBlocks,
    structureShifts,
    oieResults,
    swingHighs: swings.highs,
    swingLows: swings.lows,
    volumeProfile: {
      current: currentVolume,
      average: volumeAvg,
      ratio: volumeAvg > 0 ? currentVolume / volumeAvg : 1,
    },
    riskParameters: {
      atr: calculateATR(candles, 14),
      recommendedLeverage:
        calculateATR(candles, 14) / currentPrice > 0.02 ? 5 : 10,
      maxPositionRiskPct: 2.0,
    },
  };
}
