// ============================================================
// ADMIN AFFILIATES API
// Manage affiliate applications with Telegram notifications
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: applications, error } = await supabase
      .from("affiliate_applications")
      .select("*, users: user_id (alphanumeric_id, telegram_id)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
    }

    const formatted = (applications || []).map((app: any) => ({
      id: app.id,
      user_id: app.user_id,
      alphanumeric_id: app.users?.alphanumeric_id || "UNKNOWN",
      telegram_id: app.users?.telegram_id || 0,
      form_data: app.form_data,
      status: app.status,
      reviewed_at: app.reviewed_at,
      created_at: app.created_at,
    }));

    return NextResponse.json({ applications: formatted });
  } catch (err) {
    console.error("Affiliates GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("affiliate_applications")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, users: user_id (telegram_id)")
      .single();

    if (error) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Send Telegram notification (fire and forget)
    const telegramId = data?.users?.telegram_id;
    if (telegramId) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const message =
          status === "approved"
            ? "Congratulations! Your affiliate application has been approved. Access your Partner Hub from the main menu."
            : "Your affiliate application has been reviewed. Unfortunately, it was not approved at this time.";

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramId,
            text: message,
            parse_mode: "HTML",
          }),
        }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Affiliates PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
