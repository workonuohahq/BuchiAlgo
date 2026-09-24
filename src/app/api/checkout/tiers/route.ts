export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data: tiers, error } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load tiers" }, { status: 500 });
    }

    return NextResponse.json({ tiers: tiers || [] });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
