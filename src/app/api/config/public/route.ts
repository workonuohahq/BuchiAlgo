export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const PUBLIC_KEYS = ["currency_symbol", "platform_name"] as const;

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("system_config")
      .select("key,value")
      .in("key", [...PUBLIC_KEYS]);

    if (error) return NextResponse.json({ error: "Failed to load public config" }, { status: 500 });

    const config: Record<string, unknown> = {};
    for (const row of data || []) config[row.key] = row.value;
    return NextResponse.json(config, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
