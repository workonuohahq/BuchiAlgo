import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export function validateTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 600): TelegramWebAppUser {
  if (!initData || !botToken) throw new Error("Invalid Telegram authentication");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userJson = params.get("user");

  if (!hash || !Number.isFinite(authDate) || !userJson) throw new Error("Invalid Telegram authentication");

  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -60 || age > maxAgeSeconds) throw new Error("Expired Telegram authentication");

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const received = Buffer.from(hash, "hex");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("Invalid Telegram authentication");
  }

  const user = JSON.parse(userJson) as TelegramWebAppUser;
  if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error("Invalid Telegram user");

  return user;
}
