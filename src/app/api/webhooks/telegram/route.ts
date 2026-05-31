// ============================================================
// TELEGRAM WEBHOOK HANDLER
// Alternative to polling — receives updates from Telegram
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Forward to bot processing logic
    // In production, this would import and call the bot handlers
    // For now, the bot uses polling mode (bot/src/index.ts)

    console.log("Telegram webhook received:", update.update_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: false });
  }
}
