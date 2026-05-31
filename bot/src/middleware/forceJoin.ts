// ============================================================
// FORCE-JOIN MIDDLEWARE
// Enforces channel membership before any command execution
// Caches verification state for 24 hours
// ============================================================

import type TelegramBot from "node-telegram-bot-api";
import { getConfig } from "../utils/supabase";

// In-memory cache for verification state: { [telegramId]: timestamp }
const verificationCache: Record<number, number> = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if user is member of all required channels
 * Returns true if verified, false if not (and sends join message)
 */
export async function enforceForceJoin(
  bot: TelegramBot,
  telegramId: number,
  message: TelegramBot.Message
): Promise<boolean> {
  // Check cache first
  const cachedAt = verificationCache[telegramId];
  if (cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
    return true; // Cached verification valid
  }

  // Load required channels from config
  const requiredChannels: string[] = (await getConfig("required_channels")) || [];
  const forceJoinEnabled: boolean = (await getConfig("force_join_enabled")) ?? true;

  if (!forceJoinEnabled || requiredChannels.length === 0) {
    return true; // Force join disabled or no channels configured
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN!;

  // Check membership in each required channel
  const notJoined: string[] = [];

  for (const channel of requiredChannels) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel,
            user_id: telegramId,
          }),
        }
      );

      const data = await res.json();
      const status = data.result?.status;

      // Valid statuses: member, administrator, creator
      if (
        status !== "member" &&
        status !== "administrator" &&
        status !== "creator"
      ) {
        notJoined.push(channel);
      }
    } catch {
      // If check fails, assume not joined (fail secure)
      notJoined.push(channel);
    }
  }

  if (notJoined.length > 0) {
    // User hasn't joined all channels — send enforcement message
    await sendForceJoinMessage(bot, telegramId, notJoined, message);
    return false;
  }

  // User is verified — update database and cache
  verificationCache[telegramId] = Date.now();

  const { supabase } = await import("../utils/supabase");
  await (supabase as any)
    .from("users")
    .update({
      join_verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq("telegram_id", telegramId);

  return true;
}

/**
 * Send the force-join enforcement message with channel buttons
 */
async function sendForceJoinMessage(
  bot: TelegramBot,
  telegramId: number,
  notJoined: string[],
  originalMessage: TelegramBot.Message
): Promise<void> {
  const platformName = (await getConfig("platform_name")) || "BuchiAlgo";

  let text = `🔒 <b>Access Restricted</b>\n\n`;
  text += `To use ${platformName}, please join our official channels:\n\n`;

  const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [];

  for (const channel of notJoined) {
    const channelName = channel.replace("@", "").replace("https://t.me/", "");
    text += `• ${channel}\n`;
    inlineKeyboard.push([
      {
        text: `📢 Join @${channelName}`,
        url: channel.startsWith("http") ? channel : `https://t.me/${channelName}`,
      },
    ]);
  }

  text += `\nTap "Verify Join" after joining all channels.`;

  inlineKeyboard.push([
    {
      text: "🔄 Verify Join",
      callback_data: "verify_join",
    },
  ]);

  await bot.sendMessage(telegramId, text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

/**
 * Clear verification cache for a user (called on /start or manual verify)
 */
export function clearVerificationCache(telegramId: number): void {
  delete verificationCache[telegramId];
}
