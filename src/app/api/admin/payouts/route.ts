// ============================================================
// ADMIN PAYOUTS API
// Process affiliate payout requests
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: payouts, error } = await supabase
      .from("payout_requests")
      .select("*, users: affiliate_id (alphanumeric_id)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 });
    }

    const formatted = (payouts || []).map((p: any) => ({
      id: p.id,
      affiliate_id: p.affiliate_id,
      alphanumeric_id: p.users?.alphanumeric_id || "UNKNOWN",
      amount: p.amount,
      status: p.status,
      routing_data: p.routing_data,
      created_at: p.created_at,
    }));

    return NextResponse.json({ payouts: formatted });
  } catch (err) {
    console.error("Payouts GET error:", err);
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
      .from("payout_requests")
      .update({
        status,
        processed_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Payouts PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
