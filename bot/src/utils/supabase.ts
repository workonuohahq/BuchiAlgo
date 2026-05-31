// ============================================================
// BOT SUPABASE CLIENT
// Service-role access for bot operations
// ============================================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================
// CONFIG LOADER — Fetches dynamic config from system_config
// ============================================================
export async function getConfig(key: string): Promise<any> {
  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) return null;
  return (data as any).value;
}

export async function getAllConfigs(): Promise<Record<string, any>> {
  const { data, error } = await supabase.from("system_config").select("*");

  if (error || !data) return {};
  const configs: Record<string, any> = {};
  for (const item of data as any[]) {
    configs[item.key] = item.value;
  }
  return configs;
}
