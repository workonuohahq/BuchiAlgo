// ============================================================
// ADMIN CONFIG API
// CRUD operations for system_config key-value store
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    const supabase = createServiceRoleClient();

    if (key) {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .eq("key", key)
        .single();

      if (error) {
        return NextResponse.json({ value: null });
      }

      return NextResponse.json(data);
    }

    // Return all config
    const { data, error } = await supabase.from("system_config").select("*");

    if (error) {
      return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
    }

    return NextResponse.json({ configs: data });
  } catch (err) {
    console.error("Config GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("system_config")
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Config POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
