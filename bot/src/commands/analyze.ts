// ============================================================
// /ANALYZE COMMAND HANDLER
// Processes trading symbol + timeframe, runs math engine
// Returns formatted OIE results with institutional styling
// ============================================================

import type TelegramBot from "node-telegram-bot-api";
import { supabase, getConfig } from "../utils/supabase";
import { enforceForceJoin } from "../middleware/forceJoin";

interface BotUser {
  id: string;
  telegram_id: number;
  alphanumeric_id: string;
  scan_credits: number;
  is_premium: boolean;
  join_verified: boolean;
  premium_until: string | null;
  referred_by: string | null;
  created_at: string;
}

// Active analysis sessions per user
const analysisSessions: Record<
  number,
  { step: "symbol" | "timeframe"; symbol?: string }
> = {};

export default async function handleAnalyze(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null
): Promise<void> {
  const telegramId = msg.from?.id;
  if (!telegramId) return;

  const chatId = msg.chat.id;

  // Force-join check
  const isVerified = await enforceForceJoin(bot, telegramId, msg);
  if (!isVerified) return;

  // Check user credits
  const { data: userData } = await supabase
    .from("users")
    .select("id, scan_credits, is_premium")
    .eq("telegram_id", telegramId)
    .single();

  const user = userData as BotUser | null;

  if (!user) {
    await bot.sendMessage(chatId, "❌ Please use /start to register first.", {
      parse_mode: "HTML",
    });
    return;
  }

  if (!user.is_premium && (user.scan_credits || 0) <= 0) {
    await bot.sendMessage(
      chatId,
      `⚠️ <b>Out of Scan Credits</b>\n\n` +
        `Your free scans have been used up. Upgrade to Premium for unlimited scans, or wait for your daily refill.\n\n` +
        `Tap below to upgrade:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "👑 Upgrade to Premium", callback_data: "cmd_premium" }],
          ],
        },
      }
    );
    return;
  }

  // Parse inline args: /analyze BTCUSDT 1h
  const args = match?.[1]?.trim().split(/\s+/);

  if (args && args.length >= 1) {
    // Direct execution with args
    const symbol = args[0];
    const timeframe = args[1] || "1h";
    await runAnalysis(bot, chatId, telegramId, user.id, symbol, timeframe);
  } else {
    // Interactive mode
    analysisSessions[telegramId] = { step: "symbol" };
    await bot.sendMessage(
      chatId,
      `📊 <b>Market Analysis</b>\n\n` +
        `Enter a trading symbol or paste a TradingView link:\n\n` +
        `<code>BTCUSDT</code>, <code>ETHUSDT</code>, <code>FOREXCOM:US30</code>\n` +
        `Or: <code>https://tradingview.com/chart/?symbol=BINANCE:BTCUSDT</code>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_analysis" }]],
        },
      }
    );
  }
}

/**
 * Handle interactive analysis flow
 */
export async function handleAnalysisInput(
  bot: TelegramBot,
  telegramId: number,
  chatId: number,
  text: string
): Promise<boolean> {
  const session = analysisSessions[telegramId];
  if (!session) return false; // Not in analysis flow

  if (session.step === "symbol") {
    session.symbol = text.trim();
    session.step = "timeframe";

    await bot.sendMessage(
      chatId,
      `✅ Symbol: <code>${session.symbol}</code>\n\n` +
        `Now select a timeframe:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "5m", callback_data: "tf_5m" },
              { text: "15m", callback_data: "tf_15m" },
              { text: "30m", callback_data: "tf_30m" },
            ],
            [
              { text: "1h", callback_data: "tf_1h" },
              { text: "4h", callback_data: "tf_4h" },
              { text: "1d", callback_data: "tf_1d" },
            ],
          ],
        },
      }
    );
    return true;
  }

  return false;
}

/**
 * Run the actual analysis via API
 */
export async function runAnalysis(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  userId: string,
  symbol: string,
  timeframe: string
): Promise<void> {
  // Show loading
  const loadingMsg = await bot.sendMessage(chatId, "🔍 <b>Analyzing...</b>\nFetching market data and running calculations...", {
    parse_mode: "HTML",
  });

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        timeframe,
        userId,
        useCredits: true,
      }),
    });

    const data = await res.json();

    // Delete loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    if (!res.ok) {
      const errorMsg = data.error || "Analysis failed";
      if (data.code === "INSUFFICIENT_CREDITS") {
        await bot.sendMessage(
          chatId,
          `⚠️ <b>Out of Credits</b>\n\n${errorMsg}\n\nUpgrade for unlimited scans.`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "👑 Upgrade Now", callback_data: "cmd_premium" }],
              ],
            },
          }
        );
      } else {
        await bot.sendMessage(chatId, `❌ <b>Error</b>\n\n${errorMsg}`, {
          parse_mode: "HTML",
        });
      }
      return;
    }

    // Format and send results
    const result = data.result;
    const currencySymbol = (await getConfig("currency_symbol")) || "$";

    await sendAnalysisResult(bot, chatId, result, currencySymbol);
  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    await bot.sendMessage(
      chatId,
      `❌ <b>Analysis Failed</b>\n\n${(err as Error).message}`,
      { parse_mode: "HTML" }
    );
  }

  // Clear session
  delete analysisSessions[telegramId];
}

/**
 * Format analysis results as institutional-grade message
 */
async function sendAnalysisResult(
  bot: TelegramBot,
  chatId: number,
  result: any,
  currencySymbol: string
): Promise<void> {
  const { symbol, exchange, timeframe, currentPrice, currentTrend, oieResults, fvgs, orderBlocks, structureShifts, volumeProfile } = result;

  // Main summary
  let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ <b>BUCHIALGO QUANT ANALYSIS</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `📊 <b>${symbol}</b> | ${exchange}\n`;
  text += `⏱ Timeframe: <b>${timeframe}</b>\n`;
  text += `💰 Price: <code>${currentPrice.toFixed(2)}</code>\n`;
  text += `📈 Trend: <b>${currentTrend.toUpperCase()}</b>\n`;
  text += `📊 Volume: ${volumeProfile.ratio.toFixed(2)}x avg\n\n`;

  await bot.sendMessage(chatId, text, { parse_mode: "HTML" });

  // OIE Results (Top 3)
  if (oieResults && oieResults.length > 0) {
    for (let i = 0; i < Math.min(3, oieResults.length); i++) {
      const oie = oieResults[i];
      let oieText = `━━━━━━━━━━━━━━━━\n`;
      oieText += `🎯 <b>OIE SIGNAL #${i + 1}</b> (${oie.zoneType})\n`;
      oieText += `━━━━━━━━━━━━━━━━\n\n`;
      oieText += `💎 <b>Entry Price:</b> <code>${oie.price}</code>\n`;
      oieText += `🟢 <b>Entry Zone:</b> <code>${oie.entryZone.bottom}</code> - <code>${oie.entryZone.top}</code>\n`;
      oieText += `🔴 <b>Stop Loss:</b> <code>${oie.stopLoss}</code>\n\n`;
      oieText += `📐 <b>Take Profits:</b>\n`;
      oieText += `  TP1: <code>${oie.takeProfits.tp1}</code> (R:R ${oie.riskRewardRatios.rr1})\n`;
      oieText += `  TP2: <code>${oie.takeProfits.tp2}</code> (R:R ${oie.riskRewardRatios.rr2})\n`;
      oieText += `  TP3: <code>${oie.takeProfits.tp3}</code> (R:R ${oie.riskRewardRatios.rr3})\n\n`;
      oieText += `📊 Confidence: <b>${oie.confidence}%</b>\n`;
      oieText += `📏 ATR: ${oie.atr}\n`;

      await bot.sendMessage(chatId, oieText, { parse_mode: "HTML" });
    }
  }

  // Structure summary
  let structText = `━━━━━━━━━━━━━━━━\n`;
  structText += `📐 <b>STRUCTURE SUMMARY</b>\n`;
  structText += `━━━━━━━━━━━━━━━━\n\n`;
  structText += `• FVG Zones: ${fvgs?.length || 0}\n`;
  structText += `• Order Blocks: ${orderBlocks?.length || 0}\n`;
  structText += `• Structure Shifts: ${structureShifts?.length || 0}\n`;
  structText += `• OIE Signals: ${oieResults?.length || 0}\n\n`;
  structText += `<i>All calculations are deterministic — zero AI.</i>`;

  await bot.sendMessage(chatId, structText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡ New Scan", callback_data: "cmd_analyze" }],
        [{ text: "📊 Full Dashboard", web_app: { url: process.env.TELEGRAM_MINI_APP_URL || "" } }],
      ],
    },
  });
}

/**
 * Handle timeframe callback
 */
export async function handleTimeframeCallback(
  bot: TelegramBot,
  telegramId: number,
  chatId: number,
  timeframe: string
): Promise<void> {
  const session = analysisSessions[telegramId];
  if (!session || !session.symbol) return;

  const { data: userData } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  const user = userData as BotUser | null;

  if (user) {
    await runAnalysis(bot, chatId, telegramId, user.id, session.symbol, timeframe);
  }
}
