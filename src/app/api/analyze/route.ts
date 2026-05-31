// ============================================================
// ANALYSIS API — Runs the deterministic math engine
// Accepts symbol + timeframe, returns full quantitative analysis
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { runFullAnalysis, extractSymbolFromUrl, DEFAULT_PARAMS } from "@/lib/math/engine";
import { fetchWithFallback } from "@/lib/math/dataFetch";
import { normalizeTimeframe } from "@/lib/math/dataFetch";
import type { MathParameters } from "@/lib/math/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { symbol, timeframe, userId, useCredits } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol or TradingView URL is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Extract symbol info
    const extracted = extractSymbolFromUrl(symbol);
    const cleanSymbol = extracted?.symbol || symbol.toUpperCase();
    const exchange = extracted?.exchange || "BINANCE";

    // Check user credits if requested
    if (useCredits && userId) {
      const { data: user } = await supabase
        .from("users")
        .select("scan_credits, is_premium")
        .eq("id", userId)
        .single();

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (!user.is_premium && (user.scan_credits || 0) <= 0) {
        return NextResponse.json(
          { error: "No scan credits remaining", code: "INSUFFICIENT_CREDITS" },
          { status: 403 }
        );
      }

      // Deduct credit for non-premium users
      if (!user.is_premium) {
        await supabase
          .from("users")
          .update({ scan_credits: (user.scan_credits || 0) - 1 })
          .eq("id", userId);
      }
    }

    // Load math parameters from system_config
    const { data: mathConfig } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "math_parameters")
      .single();

    const params: MathParameters = {
      ...DEFAULT_PARAMS,
      ...(mathConfig?.value as Partial<MathParameters> || {}),
    };

    // Fetch OHLCV data
    const tf = normalizeTimeframe(timeframe || "1h");
    const { candles, source } = await fetchWithFallback(
      cleanSymbol,
      exchange.toLowerCase(),
      tf,
      params.lookback_period
    );

    if (candles.length < params.min_candles_required) {
      return NextResponse.json(
        {
          error: `Insufficient data. Required ${params.min_candles_required} candles, got ${candles.length}`,
        },
        { status: 422 }
      );
    }

    // Run the deterministic math engine
    const result = runFullAnalysis(candles, cleanSymbol, exchange, tf, params);

    // Store scan result
    if (userId) {
      await supabase.from("scan_results").insert({
        user_id: userId,
        symbol: cleanSymbol,
        exchange,
        timeframe: tf,
        analysis_data: result,
      });
    }

    // Log command usage
    await supabase.from("bot_command_logs").insert({
      telegram_id: userId ? parseInt(userId) : 0,
      command: "/analyze",
      params: { symbol: cleanSymbol, exchange, timeframe: tf },
      response: {
        fvgs_count: result.fvgs.length,
        obs_count: result.orderBlocks.length,
        mss_count: result.structureShifts.length,
        oie_count: result.oieResults.length,
      },
      processing_time_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      source,
      processing_time_ms: Date.now() - startTime,
      result,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Analysis failed" },
      { status: 500 }
    );
  }
}
