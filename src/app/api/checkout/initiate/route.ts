// ============================================================
// CHECKOUT INITIATION API
// Creates Paystack/NOWPayments/manual payment sessions
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "buchialgo-default-secret"
);

export async function POST(request: NextRequest) {
  try {
    const { tierId, gateway = "paystack" } = await request.json();

    if (!tierId) {
      return NextResponse.json({ error: "Tier ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get tier details
    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("id", tierId)
      .single();

    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Get user from request (from JWT or session)
    // For now, we'll require userId in the request
    const { userId, telegramId } = await request.json();

    // Create transaction record
    const { data: transaction } = await supabase
      .from("transactions")
      .insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        provider_type: gateway === "crypto" ? "nowpayments" : gateway === "manual" ? "manual" : "paystack",
        amount: tier.price,
        status: "pending",
        metadata: {
          tier_id: tierId,
          tier_name: tier.name,
          telegram_id: telegramId,
        },
      })
      .select()
      .single();

    if (gateway === "paystack") {
      // Initialize Paystack transaction
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        return NextResponse.json({ error: "Paystack not configured" }, { status: 500 });
      }

      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `user-${telegramId}@buchialgo.local`,
          amount: Math.round(tier.price * 100), // kobo
          metadata: {
            user_id: userId,
            tier_id: tierId,
            telegram_id: telegramId,
            transaction_id: transaction?.id,
          },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/verify`,
        }),
      });

      const data = await res.json();

      if (data.status && data.data?.authorization_url) {
        return NextResponse.json({
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
        });
      }

      return NextResponse.json({ error: "Paystack initialization failed" }, { status: 500 });
    }

    if (gateway === "crypto") {
      // NOWPayments flow
      const nowPaymentsKey = process.env.NOWPAYMENTS_API_KEY;
      if (!nowPaymentsKey) {
        return NextResponse.json({ error: "NOWPayments not configured" }, { status: 500 });
      }

      const metadata = Buffer.from(
        JSON.stringify({ user_id: userId, tier_id: tierId, telegram_id: telegramId })
      ).toString("base64");

      const res = await fetch("https://api.nowpayments.io/v1/payment", {
        method: "POST",
        headers: {
          "x-api-key": nowPaymentsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: tier.price,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nowpayments`,
          order_id: transaction?.id,
          order_description: `${tier.name} Subscription`,
          payment_extra_id: metadata,
        }),
      });

      const data = await res.json();

      if (data.payment_id) {
        // Update transaction with provider ID
        await supabase
          .from("transactions")
          .update({ provider_tx_id: data.payment_id })
          .eq("id", transaction?.id);

        return NextResponse.json({
          payment_url: data.invoice_url || data.pay_address,
          payment_id: data.payment_id,
        });
      }

      return NextResponse.json({ error: "NOWPayments failed" }, { status: 500 });
    }

    if (gateway === "manual") {
      // Return manual bank transfer instructions
      const { data: gatewayConfig } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "payment_gateway_keys")
        .single();

      const config = (gatewayConfig?.value || {}) as any;

      return NextResponse.json({
        manualTransfer: {
          bankName: config.manual_bank_name || "Example Bank",
          accountNumber: config.manual_account_number || "1234567890",
          accountName: config.manual_account_name || "BuchiAlgo Ltd",
          amount: tier.price,
          instructions:
            config.manual_instructions || "Transfer the exact amount and upload your receipt.",
          transactionId: transaction?.id,
        },
      });
    }

    return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
