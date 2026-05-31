// ============================================================
// MATH ENGINE TYPE DEFINITIONS
// Pure deterministic quantitative analysis types
// ============================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MathParameters {
  lookback_period: number;
  swing_lookback: number;
  fvg_min_size_pct: number;
  fvg_max_age_candles: number;
  ob_volume_multiplier: number;
  ob_lookback: number;
  atr_multiplier_sl: number;
  atr_multiplier_tp1: number;
  atr_multiplier_tp2: number;
  atr_multiplier_tp3: number;
  mss_breakout_threshold: number;
  volume_ma_period: number;
  enable_fvg: boolean;
  enable_ifvg: boolean;
  enable_ob: boolean;
  enable_mss: boolean;
  quarter_rounding_precision: number;
  min_candles_required: number;
}

export interface FVGZone {
  type: "bullish" | "bearish";
  startIndex: number;
  endIndex: number;
  top: number;
  bottom: number;
  size: number;
  sizePct: number;
  midpoint: number;
  oiePrice: number;
  isInverse: boolean;
  age: number;
  volumeAtFormation: number;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: "high" | "low";
}

export interface OrderBlock {
  type: "bullish" | "bearish";
  index: number;
  top: number;
  bottom: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  midpoint: number;
  oiePrice: number;
  orderBlockCandle: OHLCV;
}

export interface MarketStructureShift {
  type: "bullish" | "bearish";
  breakIndex: number;
  breakPrice: number;
  previousSwing: SwingPoint;
  confirmingVolume: number;
}

export interface OIEResult {
  price: number;
  entryZone: {
    top: number;
    bottom: number;
  };
  stopLoss: number;
  takeProfits: {
    tp1: number;
    tp2: number;
    tp3: number;
  };
  riskRewardRatios: {
    rr1: number;
    rr2: number;
    rr3: number;
  };
  atr: number;
  confidence: number;
  zoneType: string;
  zoneIndex: number;
}

export interface FullAnalysisResult {
  symbol: string;
  exchange: string;
  timeframe: string;
  timestamp: number;
  currentPrice: number;
  currentTrend: "bullish" | "bearish" | "neutral";
  fvgs: FVGZone[];
  inverseFvgs: FVGZone[];
  orderBlocks: OrderBlock[];
  structureShifts: MarketStructureShift[];
  oieResults: OIEResult[];
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  volumeProfile: {
    current: number;
    average: number;
    ratio: number;
  };
  riskParameters: {
    atr: number;
    recommendedLeverage: number;
    maxPositionRiskPct: number;
  };
}

export interface ExtractedSymbol {
  symbol: string;
  exchange: string;
  raw: string;
}
