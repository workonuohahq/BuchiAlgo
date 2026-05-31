// ============================================================
// CALLBACK QUERY HANDLER
// Routes all inline button callbacks
// ============================================================

import type TelegramBot from "node-telegram-bot-api";
import { clearVerificationCache } from "../middleware/forceJoin";
import { isInReferralFlow, setReferralFlow } from "./referral";
import handleAnalyze, { handleTimeframeCallback } from "../commands/analyze";
import handleDashboard from "../commands/dashboard";
import { supabase, getConfig } from "../utils/supabase";

export default async function handleCallbackQuery(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const telegramId = query.from.id;
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId || !data) return;

  // Answer callback to remove loading state
  await bot.answerCallbackQuery(query.id);

  try {
    switch (data) {
      case "verify_join":
        await handleVerifyJoin(bot, telegramId, chatId, query.message!.message_id);
        break;

      case "skip_referral":
        setReferralFlow(telegramId, false);
        await bot.sendMessage(chatId, "Continuing without referral code...", {
          parse_mode: "HTML",
        });
        break;

      case "cmd_analyze":
        await bot.sendMessage(
          chatId,
          `📊 <b>Quick Scan</b>\n\n` +
            `Send me a symbol or TradingView link:\n` +
            `<code>BTCUSDT</code>, <code>ETHUSDT</code>\n` +
            `Or: <code>/analyze BTCUSDT 1h</code>`,
          { parse_mode: "HTML" }
        );
        break;

      case "cmd_premium":
        await handlePremiumCallback(bot, chatId);
        break;

      case "cmd_dashboard":
        await handleDashboard(bot, { chat: { id: chatId }, from: query.from } as any);
        break;

      case "cmd_referral":
        await handleReferralCallback(bot, telegramId, chatId);
        break;

      case "cancel_analysis":
        await bot.sendMessage(chatId, "❌ Analysis cancelled.", { parse_mode: "HTML" });
        break;

      case "cmd_help":
        await handleHelp(bot, chatId);
        break;

      default:
        // Handle timeframe callbacks
        if (data.startsWith("tf_")) {
          const tf = data.replace("tf_", "");
          await handleTimeframeCallback(bot, telegramId, chatId, tf);
        }
        break;
    }
  } catch (err) {
    console.error("Callback error:", err);
  }
}

async function handleVerifyJoin(
  bot: TelegramBot,
  telegramId: number,
  chatId: number,
  messageId: number
): Promise<void> {
  clearVerificationCache(telegramId);

  // Re-check force join
  const { enforceForceJoin } = await import("../middleware/forceJoin");

  // Delete old message
  await bot.deleteMessage(chatId, messageId).catch(() => {});

  // Create a mock message for the middleware
  const mockMsg = { chat: { id: chatId }, from: { id: telegramId } } as any;
  const isVerified = await enforceForceJoin(bot, telegramId, mockMsg);

  if (isVerified) {
    await bot.sendMessage(
      chatId,
      `✅ <b>Verification Complete!</b>\n\nWelcome! You can now use all features.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⚡ Start Analysis", callback_data: "cmd_analyze" }],
          ],
        },
      }
    );
  }
  // If not verified, enforceForceJoin already sent a new message
}

async function handlePremiumCallback(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  const platformName = (await getConfig("platform_name")) || "BuchiAlgo";
  const currencySymbol = (await getConfig("currency_symbol")) || "$";

  // Get active tiers
  interface SubscriptionTier {
    id: string;
    name: string;
    price: number;
    billing_cycle: string;
    scan_limit: number;
    features: string[];
    is_active: boolean;
  }

  const { data: tiersData } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  const tiers = (tiersData || []) as SubscriptionTier[];

  let text = `👑 <b>${platformName} Premium</b>\n\n`;
  text += `Unlock institutional-grade analytics:\n\n`;
  text += `✅ Unlimited scans\n`;
  text += `✅ All timeframes (1m - 1D)\n`;
  text += `✅ FVG + IFVG + OB + MSS\n`;
  text += `✅ Precise OIE calculations\n`;
  text += `✅ Priority alerts\n`;
  text += `✅ Webhook API access\n\n`;

  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  if (tiers && tiers.length > 0) {
    text += `━━━━━━━━━━━━━━━━\n`;
    for (const tier of tiers) {
      text += `\n<b>${tier.name}</b>\n`;
      text += `${currencySymbol}${tier.price} / ${tier.billing_cycle}\n`;
      if (tier.features) {
        for (const feature of tier.features.slice(0, 3)) {
          text += `• ${feature}\n`;
        }
      }
      keyboard.push([
        {
          text: `💳 ${tier.name} — ${currencySymbol}${tier.price}`,
          callback_data: `subscribe_${tier.id}`,
        },
      ]);
    }
  }

  keyboard.push([
    {
      text: "🌐 Open Web Checkout",
      web_app: {
        url: `${process.env.TELEGRAM_MINI_APP_URL}/checkout`,
      },
    },
  ]);

  await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleReferralCallback(
  bot: TelegramBot,
  telegramId: number,
  chatId: number
): Promise<void> {
  interface UserMini { alphanumeric_id: string; }

  const { data: userData } = await supabase
    .from("users")
    .select("alphanumeric_id")
    .eq("telegram_id", telegramId)
    .single();

  const user = userData as UserMini | null;
  if (!user) return;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "BuchiAlgoBot";
  const referralLink = `https://t.me/${botUsername}?start=${user.alphanumeric_id}`;

  const rewardCredits = (await getConfig("referral_reward_credits")) || 3;

  let text = `🔗 <b>Your Referral Link</b>\n\n`;
  text += `<code>${referralLink}</code>\n\n`;
  text += `Share this link with other traders.\n`;
  text += `You'll earn <b>${rewardCredits} scan credits</b> for each new user who joins!\n\n`;
  text += `<i>Tap to copy the link above.</i>`;

  await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📱 Share",
            url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me on BuchiAlgo for institutional-grade trading analytics!`,
          },
        ],
      ],
    },
  });
}

async function handleHelp(bot: TelegramBot, chatId: number): Promise<void> {
  const platformName = (await getConfig("platform_name")) || "BuchiAlgo";

  let text = `❓ <b>${platformName} Help</b>\n\n`;
  text += `<b>Commands:</b>\n`;
  text += `• /start — Register & main menu\n`;
  text += `• /analyze [symbol] [timeframe] — Run analysis\n`;
  text += `• /dashboard — View your stats\n\n`;
  text += `<b>How to analyze:</b>\n`;
  text += `1. Tap "Run Quick Scan"\n`;
  text += `2. Enter a symbol (BTCUSDT) or TradingView link\n`;
  text += `3. Select timeframe\n`;
  text += `4. Receive OIE signals with entry, SL, and TP levels\n\n`;
  text += `<b>Supported exchanges:</b>\n`;
  text += `BINANCE, BYBIT, OKX, KUCOIN, FOREXCOM\n\n`;
  text += `<b>Need help?</b> Contact support.`;

  await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
}
