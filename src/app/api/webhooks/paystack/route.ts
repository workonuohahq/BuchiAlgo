// ============================================================
// PAYSTACK WEBHOOK HANDLER
// Validates signatures, processes successful payments,
// upgrades user to premium on confirmation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createHash, createHmac } from "crypto";

function verifyPaystackSignature(body: string, signature: string, secret: string): boolean {
  const hash = createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";
    const secret = process.env.PAYSTACK_SECRET_KEY || "";

    if (!secret) {
      return NextResponse.json({ error: "Paystack not configured" }, { status: 500 });
    }

    // Verify webhook signature
    if (!verifyPaystackSignature(body, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { reference, amount, metadata, customer } = event.data;
      const userId = metadata?.user_id;
      const tierId = metadata?.tier_id;
      const telegramId = metadata?.telegram_id;

      if (!userId || !tierId) {
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      const supabase = createServiceRoleClient();

      // Check for duplicate
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("provider_tx_id", reference)
        .single();

      if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Get tier details
      const { data: tier } = await supabase
        .from("subscription_tiers")
        .select("*")
        .eq("id", tierId)
        .single();

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: userId,
        provider_type: "paystack",
        provider_tx_id: reference,
        amount: amount / 100, // Paystack amounts are in kobo
        status: "completed",
        metadata: {
          email: customer?.email,
          tier_id: tierId,
          tier_name: tier?.name,
          telegram_id: telegramId,
        },
      });

      // Activate premium
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + 1); // 1 month default

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_until: premiumUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // TODO: Send Telegram notification to user

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
