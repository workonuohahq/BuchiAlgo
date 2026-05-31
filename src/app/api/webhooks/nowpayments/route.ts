// ============================================================
// NOWPAYMENTS IPN WEBHOOK HANDLER
// Handles async Web3/crypto payment states:
// waiting -> confirming -> finished / failed
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

function verifyIPNSignature(payload: string, signature: string, secret: string): boolean {
  const hash = createHmac("sha512", secret).update(payload).digest("hex");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-nowpayments-sig") || "";
    const secret = process.env.NOWPAYMENTS_IPN_SECRET || "";

    // Parse the payload
    const payload = JSON.parse(body);

    // Verify IPN signature if secret is configured
    if (secret && signature) {
      if (!verifyIPNSignature(body, signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const {
      payment_id,
      payment_status,
      pay_address,
      pay_amount,
      actually_paid,
      pay_currency,
      order_id,
      order_description,
      purchase_id,
      created_at,
      updated_at,
      outcome_amount,
      outcome_currency,
    } = payload;

    const supabase = createServiceRoleClient();

    // Extract user_id and tier_id from order_description or metadata
    const metadata = payload.payment_extra_id
      ? JSON.parse(Buffer.from(payload.payment_extra_id, "base64").toString())
      : {};

    const userId = metadata.user_id;
    const tierId = metadata.tier_id;

    // Map payment status
    const statusMap: Record<string, "pending" | "completed" | "failed"> = {
      waiting: "pending",
      confirming: "pending",
      confirmed: "pending",
      sending: "pending",
      partially_paid: "pending",
      finished: "completed",
      failed: "failed",
      refunded: "failed",
      expired: "failed",
    };

    const mappedStatus = statusMap[payment_status] || "pending";

    // Upsert transaction
    await supabase.from("transactions").upsert(
      {
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        provider_type: "nowpayments",
        provider_tx_id: payment_id,
        amount: parseFloat(actually_paid || pay_amount || "0"),
        status: mappedStatus,
        metadata: {
          pay_address,
          pay_currency,
          order_id,
          purchase_id,
          payment_status,
          outcome_amount,
          outcome_currency,
          original_metadata: metadata,
          raw_payload: payload,
        },
      },
      { onConflict: "provider_tx_id" }
    );

    // If payment is finished, activate premium
    if (payment_status === "finished" && userId && userId !== "00000000-0000-0000-0000-000000000000") {
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_until: premiumUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return NextResponse.json({ received: true, status: mappedStatus });
  } catch (err) {
    console.error("NOWPayments webhook error:", err);
    return NextResponse.json({ error: "IPN processing failed" }, { status: 500 });
  }
}
