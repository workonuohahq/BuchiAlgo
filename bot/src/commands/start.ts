// ============================================================
// /START COMMAND HANDLER
// Registration, ID generation, force-join check, referral flow
// ============================================================

import type TelegramBot from "node-telegram-bot-api";
import { supabase, getConfig } from "../utils/supabase";
import { generateUniqueAlphanumericId } from "../utils/idGenerator";
import { enforceForceJoin, clearVerificationCache } from "../middleware/forceJoin";
import { promptReferral } from "../handlers/referral";

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
  role: string;
}

export default async function handleStart(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null
): Promise<void> {
  const telegramId = msg.from?.id;
  if (!telegramId) return;

  const chatId = msg.chat.id;

  // Extract referral code from deep link: /start REFERRALCODE
  const referralCode = match?.[1]?.trim().toUpperCase() || null;

  // Clear any stale verification cache
  clearVerificationCache(telegramId);

  // Force-join check
  const isVerified = await enforceForceJoin(bot, telegramId, msg);
  if (!isVerified) return;

  // Load platform config
  const configs = await getConfig("multiple");
  const platformName = (await getConfig("platform_name")) || "BuchiAlgo";
  const initials = (await getConfig("platform_initials")) || "BUCHI";
  const welcomeMsg =
    (await getConfig("welcome_message")) ||
    `Welcome to ${platformName} — your institutional-grade quantitative trading analytics engine.`;

  // Check if user exists
  let { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  let user = userData as BotUser | null;

  if (!user) {
    // Create new user
    const alphanumericId = await generateUniqueAlphanumericId(initials);
    const { data: newUserData } = await supabase
      .from("users")
      .insert({
        telegram_id: telegramId as any,
        alphanumeric_id: alphanumericId,
        join_verified: true,
        verified_at: new Date().toISOString(),
        scan_credits: 5,
        is_premium: false,
        referred_by: referralCode || null,
      } as any)
      .select()
      .single();

    user = newUserData as BotUser | null;
    const newUser = user;

    // If deep-link referral, process it
    if (referralCode && newUser) {
      // Award credits to referrer
      const { data: referrerData } = await supabase
        .from("users")
        .select("id, scan_credits, telegram_id")
        .eq("alphanumeric_id", referralCode)
        .single();

      const referrer = referrerData as BotUser | null;

      if (referrer && referrer.id !== newUser.id) {
        const rewardCredits = (await getConfig("referral_reward_credits")) || 3;
        await (supabase as any)
          .from("users")
          .update({ scan_credits: (referrer.scan_credits || 0) + rewardCredits })
          .eq("id", referrer.id);

        await supabase.from("referral_tracking").insert({
          referrer_id: referralCode,
          referred_id: alphanumericId,
          credits_awarded: rewardCredits,
        } as any);

        // Notify referrer
        await bot.sendMessage(
          referrer.telegram_id,
          `🎉 <b>New Referral!</b>\n\nUser <code>${alphanumericId}</code> joined using your code!\nYou earned <b>${rewardCredits}</b> bonus credits.`,
          { parse_mode: "HTML" }
        );
      }
    }
  } else {
    // Update join_verified status
    await (supabase as any)
      .from("users")
      .update({ join_verified: true, verified_at: new Date().toISOString() })
      .eq("telegram_id", telegramId);
  }

  // Build welcome message
  let welcomeText = `👋 <b>Welcome, ${msg.from?.first_name || "Trader"}!</b>\n\n`;
  welcomeText += `${welcomeMsg}\n\n`;
  welcomeText += `━━━━━━━━━━━━━━━━\n`;
  welcomeText += `🆔 <b>Your ID:</b> <code>${user?.alphanumeric_id}</code>\n`;
  welcomeText += `⚡ <b>Scan Credits:</b> ${user?.scan_credits || 0}\n`;
  welcomeText += `👑 <b>Status:</b> ${user?.is_premium ? "Premium" : "Free"}\n`;
  welcomeText += `━━━━━━━━━━━━━━━━\n\n`;

  // Build main menu keyboard
  const keyboard = buildMainMenuKeyboard(user);

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });

  // Prompt for referral if new user and no referral yet
  if (user && !user.referred_by && !referralCode) {
    await promptReferral(bot, telegramId);
  }
}

function buildMainMenuKeyboard(user: any): TelegramBot.InlineKeyboardButton[][] {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [
    [
      { text: "⚡ Run Quick Scan", callback_data: "cmd_analyze" },
      { text: "👑 Unlock Alpha Access", callback_data: "cmd_premium" },
    ],
    [
      { text: "📊 My Dashboard", callback_data: "cmd_dashboard" },
      { text: "🔗 My Referral Link", callback_data: "cmd_referral" },
    ],
  ];

  // Show Partner Hub only if affiliate is approved
  if (user?.affiliate_status === "approved") {
    keyboard.push([{ text: "🤝 Partner Hub", callback_data: "cmd_partner" }]);
  }

  keyboard.push([{ text: "❓ Help & Support", callback_data: "cmd_help" }]);

  return keyboard;
}
