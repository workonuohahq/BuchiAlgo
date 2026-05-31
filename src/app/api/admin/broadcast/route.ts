// ============================================================
// ADMIN BROADCAST API
// Queue and dispatch mass messages to Telegram users
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { message, filters } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Build query based on filters
    let query = supabase.from("users").select("telegram_id, alphanumeric_id, is_premium, join_verified");

    if (filters?.type === "premium") {
      query = query.eq("is_premium", true);
    } else if (filters?.type === "non_verified") {
      query = query.eq("join_verified", false);
    } else if (filters?.type === "single_id" && filters.singleId) {
      query = query.eq("alphanumeric_id", filters.singleId.toUpperCase());
    }

    const { data: recipients, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to query recipients" }, { status: 500 });
    }

    const users = recipients || [];

    // Create broadcast record
    const adminId = request.headers.get("x-admin-id") || "00000000-0000-0000-0000-000000000000";
    const { data: broadcastRecord } = await supabase
      .from("broadcast_messages")
      .insert({
        admin_id: adminId,
        message,
        filters: filters || { type: "all" },
        status: "sending",
        sent_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    // Send messages asynchronously (fire and forget)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: user.telegram_id,
                text: message,
                parse_mode: "HTML",
                disable_web_page_preview: true,
              }),
            }
          );

          if (res.ok) {
            sent++;
          } else {
            failed++;
          }

          // Rate limiting: max 30 messages per second
          if (sent % 30 === 0) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch {
          failed++;
        }
      }

      // Update broadcast record
      if (broadcastRecord) {
        await supabase
          .from("broadcast_messages")
          .update({
            status: failed > sent ? "failed" : "completed",
            sent_count: sent,
            failed_count: failed,
            sent_at: new Date().toISOString(),
          })
          .eq("id", broadcastRecord.id);
      }

      return NextResponse.json({
        success: true,
        recipientCount: users.length,
        sent,
        failed,
        broadcastId: broadcastRecord?.id,
      });
    }

    return NextResponse.json({
      success: true,
      recipientCount: users.length,
      sent: 0,
      failed: 0,
      note: "Bot token not configured — messages queued but not sent",
    });
  } catch (err) {
    console.error("Broadcast error:", err);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
