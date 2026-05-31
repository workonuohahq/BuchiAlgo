// ============================================================
// BUCHIALGO TELEGRAM BOT — MAIN ENTRY POINT
// Async polling worker with all handlers registered
// ============================================================

import TelegramBot from "node-telegram-bot-api";
import handleStart from "./commands/start";
import handleAnalyze, { handleAnalysisInput } from "./commands/analyze";
import handleDashboard from "./commands/dashboard";
import handleCallbackQuery from "./handlers/callbacks";
import { isInReferralFlow, processReferralCode } from "./handlers/referral";
import { supabase } from "./utils/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize bot with polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("🤖 BuchiAlgo Bot started — polling active");

// ============================================================
// COMMAND REGISTRATION
// ============================================================

// /start [referralCode]
bot.onText(/^\/start(?:\s+(.+))?/, (msg, match) => {
  logCommand(msg, "/start");
  handleStart(bot, msg, match).catch((err) => {
    console.error("Start command error:", err);
    bot.sendMessage(msg.chat.id, "❌ An error occurred. Please try again.").catch(() => {});
  });
});

// /analyze [symbol] [timeframe]
bot.onText(/^\/analyze(?:\s+(.+))?/, (msg, match) => {
  logCommand(msg, "/analyze");
  handleAnalyze(bot, msg, match).catch((err) => {
    console.error("Analyze command error:", err);
    bot.sendMessage(msg.chat.id, "❌ Analysis failed. Please try again.").catch(() => {});
  });
});

// /dashboard
bot.onText(/^\/dashboard/, (msg) => {
  logCommand(msg, "/dashboard");
  handleDashboard(bot, msg).catch((err) => {
    console.error("Dashboard command error:", err);
  });
});

// ============================================================
// MESSAGE HANDLER — Catches text messages (referral codes, symbols)
// ============================================================

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const telegramId = msg.from?.id;
  if (!telegramId) return;

  // Check if user is in referral flow
  if (isInReferralFlow(telegramId)) {
    await processReferralCode(bot, telegramId, msg.text);
    return;
  }

  // Check if user is in analysis flow
  const handled = await handleAnalysisInput(bot, telegramId, msg.chat.id, msg.text);
  if (handled) return;

  // Default: unknown command
  await bot.sendMessage(
    msg.chat.id,
    `❓ I didn't understand that.\n\nUse /start for the main menu or /analyze to run a scan.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Main Menu", callback_data: "cmd_menu" }],
          [{ text: "⚡ Run Analysis", callback_data: "cmd_analyze" }],
        ],
      },
    }
  );
});

// ============================================================
// CALLBACK QUERY HANDLER — Inline button clicks
// ============================================================

bot.on("callback_query", (query) => {
  handleCallbackQuery(bot, query).catch((err) => {
    console.error("Callback error:", err);
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

bot.on("error", (error) => {
  console.error("Bot error:", error);
});

// ============================================================
// UTILITIES
// ============================================================

function logCommand(msg: TelegramBot.Message, command: string): void {
  const user = msg.from;
  console.log(`[${new Date().toISOString()}] ${command} — ${user?.id} (${user?.username || "no-username"})`);

  // Async log to database (fire and forget)
  (supabase as any)
    .from("bot_command_logs")
    .insert({
      telegram_id: user?.id || 0,
      command,
      params: { chat_id: msg.chat.id, text: msg.text },
    })
    .then(() => {})
    .catch((err: any) => console.error(err));
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down bot...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down bot...");
  bot.stopPolling();
  process.exit(0);
});

console.log("✅ All handlers registered — bot is operational");
