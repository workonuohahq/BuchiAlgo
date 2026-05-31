// ============================================================
// REFERRAL SYSTEM HANDLER
// Manages referral code capture and credit awards
// ============================================================

import type TelegramBot from "node-telegram-bot-api";
import { supabase, getConfig } from "../utils/supabase";

interface BotUser {
  id: string;
  telegram_id: number;
  alphanumeric_id: string;
  scan_credits: number;
  referred_by: string | null;
}

// Track users in referral flow
const referralFlowState: Record<number, boolean> = {};

export function isInReferralFlow(telegramId: number): boolean {
  return referralFlowState[telegramId] === true;
}

export function setReferralFlow(telegramId: number, active: boolean): void {
  if (active) {
    referralFlowState[telegramId] = true;
  } else {
    delete referralFlowState[telegramId];
  }
}

/**
 * Prompt user to enter a referral code
 */
export async function promptReferral(
  bot: TelegramBot,
  telegramId: number
): Promise<void> {
  referralFlowState[telegramId] = true;

  const text =
    `🎁 <b>Referral Program</b>\n\n` +
    `Have a referral code? Enter it now to claim bonus scan credits!\n\n` +
    `Or tap "Skip" to continue.`;

  await bot.sendMessage(telegramId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⏭️ Skip", callback_data: "skip_referral" }],
      ],
    },
  });
}

/**
 * Process a referral code submission
 */
export async function processReferralCode(
  bot: TelegramBot,
  telegramId: number,
  referralCode: string
): Promise<void> {
  delete referralFlowState[telegramId];

  const cleanCode = referralCode.trim().toUpperCase();

  // Check if code exists
  const { data: referrerData } = await supabase
    .from("users")
    .select("id, alphanumeric_id, scan_credits, telegram_id")
    .eq("alphanumeric_id", cleanCode)
    .single();

  const referrer = referrerData as BotUser | null;

  if (!referrer) {
    await bot.sendMessage(telegramId, "❌ Invalid referral code. No credits awarded.", {
      parse_mode: "HTML",
    });
    return;
  }

  // Get current user
  const { data: currentUserData } = await supabase
    .from("users")
    .select("id, alphanumeric_id, referred_by")
    .eq("telegram_id", telegramId)
    .single();

  const currentUser = currentUserData as BotUser | null;

  if (!currentUser) {
    await bot.sendMessage(telegramId, "❌ User record not found.", { parse_mode: "HTML" });
    return;
  }

  // Prevent self-referral
  if (currentUser.alphanumeric_id === cleanCode) {
    await bot.sendMessage(telegramId, "❌ You cannot refer yourself!", { parse_mode: "HTML" });
    return;
  }

  // Prevent double referral
  if (currentUser.referred_by) {
    await bot.sendMessage(telegramId, "❌ You have already used a referral code.", {
      parse_mode: "HTML",
    });
    return;
  }

  // Get reward amount from config
  const rewardCredits = (await getConfig("referral_reward_credits")) || 3;

  // Update referrer's credits
  await (supabase as any)
    .from("users")
    .update({ scan_credits: (referrer.scan_credits || 0) + rewardCredits })
    .eq("id", referrer.id);

  // Update current user's referred_by
  await (supabase as any)
    .from("users")
    .update({ referred_by: cleanCode })
    .eq("id", currentUser.id);

  // Track the referral
  await (supabase as any).from("referral_tracking").insert({
    referrer_id: cleanCode,
    referred_id: currentUser.alphanumeric_id,
    credits_awarded: rewardCredits,
  });

  // Notify both users
  await bot.sendMessage(
    telegramId,
    `✅ <b>Referral Applied!</b>\n\n` +
      `You used code <code>${cleanCode}</code>.\n` +
      `Welcome aboard! 🎉`,
    { parse_mode: "HTML" }
  );

  // Notify referrer
  await bot.sendMessage(
    referrer.telegram_id,
    `🎉 <b>New Referral!</b>\n\n` +
      `User <code>${currentUser.alphanumeric_id}</code> joined using your code.\n` +
      `You earned <b>${rewardCredits}</b> bonus scan credits!`,
    { parse_mode: "HTML" }
  );
}

/**
 * Skip referral flow
 */
export async function skipReferral(
  bot: TelegramBot,
  telegramId: number
): Promise<void> {
  delete referralFlowState[telegramId];
  await bot.sendMessage(telegramId, "Continuing without referral code...", {
    parse_mode: "HTML",
  });
}
