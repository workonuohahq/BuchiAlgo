import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tierId, gateway = "paystack", initData } = body;

    if (!tierId || typeof initData !== "string") {
      return NextResponse.json({ error: "Tier and Telegram authentication are required" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Telegram authentication is not configured" }, { status: 500 });
    }

    const telegramUser = validateTelegramInitData(initData, botToken);
    const supabase = createServiceRoleClient();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, telegram_id, username")
      .eq("telegram_id", telegramUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "Telegram user is not registered" }, { status: 403 });
    }

    const { data: tier, error: tierError } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("id", tierId)
      .eq("is_active", true)
      .single();

    if (tierError || !tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    const providerType = gateway === "crypto" ? "nowpayments" : gateway === "manual" ? "manual" : gateway === "paystack";
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        provider_type: providerType,
        amount: tier.price,
        status: "pending",
        metadata: {
          tier_id: tierId,
          tier_name: tier.name,
          telegram_id: telegramUser.id,
        },
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Unable to create payment transaction" }, { status: 500 });
    }

    if (gateway === "paystack") {
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) return NextResponse.json({ error: "Paystack not configured" }, { status: 500 });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (!appUrl) return NextResponse.json({ error: "Application URL is not configured" }, { status: 500 });

      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `telegram-${telegramUser.id}@buchialgo.local`,
          amount: Math.round(Number(tier.price) * 100),
          currency: "NGN",
          metadata: {
            user_id: user.id,
            tier_id: tierId,
            telegram_id: telegramUser.id,
            transaction_id: transaction.id,
          },
          callback_url: `${appUrl}/checkout/verify`,
        }),
      });

      const data = await res.json();
      if (data.status && data.data?.authorization_url) {
        await supabase.from("transactions").update({ provider_tx_id: data.data.reference }).eq("id", transaction.id);
        return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
      }

      return NextResponse.json({ error: "Paystack initialization failed" }, { status: 502 });
    }

    if (gateway === "crypto") {
      const nowPaymentsKey = process.env.NOWPAYMENTS_API_KEY;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (!nowPaymentsKey || !appUrl) return NextResponse.json({ error: "NOWPayments is not configured" }, { status: 500 });

      const res = await fetch("https://api.nowpayments.io/v1/payment", {
        method: "POST",
        headers: {
          "x-api-key": nowPaymentsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: Number(tier.price),
          price_currency: "usd",
          pay_currency: "usdttrc20",
          ipn_callback_url: `${appUrl}/api/webhooks/nowpayments`,
          order_id: transaction.id,
          order_description: `${tier.name} Subscription`,
        }),
      });

      const data = await res.json();
      if (data.payment_id) {
        await supabase.from("transactions").update({ provider_tx_id: data.payment_id }).eq("id", transaction.id);
        return NextResponse.json({ payment_url: data.invoice_url || data.pay_address, payment_id: data.payment_id });
      }

      return NextResponse.json({ error: "NOWPayments failed" }, { status: 502 });
    }

    if (gateway === "manual") {
      const { data: gatewayConfig } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "payment_gateway_keys")
        .single();

      const config = (gatewayConfig?.value || {}) as Record<string, string>;
      return NextResponse.json({
        manualTransfer: {
          bankName: config.manual_bank_name || "Bank transfer",
          accountNumber: config.manual_account_number || "",
          accountName: config.manual_account_name || "BuchiAlgo",
          amount: tier.price,
          instructions: config.manual_instructions || "Transfer the exact amount and submit your receipt.",
          transactionId: transaction.id,
        },
      });
    }

    return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: (err as Error).message || "Checkout failed" }, { status: 500 });
  }
}
