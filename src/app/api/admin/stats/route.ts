// ============================================================
// ADMIN STATS API
// Aggregates system-wide metrics for the dashboard
// ============================================================

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Total users
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Premium users
    const { count: premiumUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_premium", true);

    // Total revenue
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("status", "completed");

    const totalRevenue = (transactions || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    // Pending transactions
    const { count: pendingTransactions } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Recent users
    const { data: recentUsers } = await supabase
      .from("users")
      .select("id, alphanumeric_id, telegram_id, is_premium, scan_credits, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    // Recent transactions
    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select("id, amount, status, provider_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Generate mock activity data for the chart (replace with real data query)
    const activityData = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - 23 + i);
      return {
        time: hour.toLocaleTimeString("en", { hour: "2-digit" }),
        scans: Math.floor(Math.random() * 50) + 10,
        users: Math.floor(Math.random() * 20) + 5,
      };
    });

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      totalRevenue,
      scansToday: Math.floor(Math.random() * 500) + 100, // Replace with real count
      activeScans: Math.floor(Math.random() * 20) + 5,
      pendingTransactions: pendingTransactions || 0,
      userGrowth: 12.5,
      revenueGrowth: 23.8,
      recentUsers: recentUsers || [],
      recentTransactions: recentTransactions || [],
      activityData,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
