// ============================================================
// /DASHBOARD COMMAND HANDLER
// Shows user stats: ID, credits, premium status, referrals
// ============================================================

import type TelegramBot from "node-telegram-bot-api";
import { supabase } from "../utils/supabase";
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

export default async function handleDashboard(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from?.id;
  if (!telegramId) return;

  const chatId = msg.chat.id;

  // Force-join check
  const isVerified = await enforceForceJoin(bot, telegramId, msg);
  if (!isVerified) return;

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  const user = userData as BotUser | null;

  if (!user) {
    await bot.sendMessage(chatId, "❌ Please use /start to register first.", {
      parse_mode: "HTML",
    });
    return;
  }

  // Count referrals
  const { count: referralCount } = await supabase
    .from("referral_tracking")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", user.alphanumeric_id);

  let text = `📊 <b>MY DASHBOARD</b>\n`;
  text += `━━━━━━━━━━━━━━━━\n\n`;
  text += `🆔 <b>ID:</b> <code>${user.alphanumeric_id}</code>\n`;
  text += `⚡ <b>Scan Credits:</b> ${user.scan_credits || 0}\n`;
  text += `👑 <b>Status:</b> ${user.is_premium ? "⭐ Premium" : "Free"}\n`;

  if (user.is_premium && user.premium_until) {
    const until = new Date(user.premium_until);
    text += `⏰ <b>Premium Until:</b> ${until.toLocaleDateString()}\n`;
  }

  text += `👥 <b>Referrals:</b> ${referralCount || 0}\n`;
  text += `✅ <b>Verified:</b> ${user.join_verified ? "Yes" : "No"}\n`;
  text += `📅 <b>Joined:</b> ${new Date(user.created_at).toLocaleDateString()}\n\n`;
  text += `━━━━━━━━━━━━━━━━\n\n`;
  text += `<i>Share your referral link to earn bonus credits!</i>`;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "BuchiAlgoBot";

  await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🔗 Copy Referral Link",
            url: `https://t.me/${botUsername}?start=${user.alphanumeric_id}`,
          },
        ],
        [
          { text: "⚡ Run Scan", callback_data: "cmd_analyze" },
          { text: "👑 Upgrade", callback_data: "cmd_premium" },
        ],
      ],
    },
  });
}
