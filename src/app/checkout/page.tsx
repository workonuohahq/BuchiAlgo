"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Zap, Shield, ChevronRight } from "lucide-react";

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  scan_limit: number;
  features: string[];
}

export default function CheckoutPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [platformName, setPlatformName] = useState("BuchiAlgo");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js?63";
    script.async = true;
    script.onload = () => window.Telegram?.WebApp?.ready();
    document.head.appendChild(script);
    loadData();
    return () => script.remove();
  }, []);

  async function loadData() {
    try {
      const [tiersRes, configRes] = await Promise.all([
        fetch("/api/checkout/tiers"),
        fetch("/api/config/public"),
      ]);

      const tiersData = await tiersRes.json();
      const configData = await configRes.json();

      setTiers(tiersData.tiers || []);
      if (configData.currency_symbol !== undefined) {
        setCurrencySymbol(String(configData.currency_symbol));
      }
      if (configData.platform_name) setPlatformName(String(configData.platform_name));
    } catch (err) {
      console.error("Failed to load checkout data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function initiateCheckout(tierId: string) {
    try {
      const res = await fetch("/api/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          initData: typeof window !== "undefined" ? window.Telegram?.WebApp?.initData : "",
        }),
      });

      const data = await res.json();

      if (data.authorization_url) {
        // Paystack redirect
        window.location.href = data.authorization_url;
      } else if (data.payment_url) {
        // NOWPayments redirect
        window.location.href = data.payment_url;
      } else if (data.manualTransfer) {
        // Show manual transfer instructions
        alert(data.manualTransfer.instructions);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Crown className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Unlock Alpha Access</h1>
          <p className="text-slate-400">
            Choose your plan and start trading with institutional precision
          </p>
        </motion.div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier, i) => {
            const isPopular = i === 1;
            const isSelected = selectedTier === tier.id;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedTier(tier.id)}
                className={`relative p-6 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                } ${isPopular ? "md:scale-105 md:-my-2" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  {i === 0 ? (
                    <Zap className="w-5 h-5 text-amber-400" />
                  ) : i === 1 ? (
                    <Crown className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Shield className="w-5 h-5 text-purple-400" />
                  )}
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold">
                    {currencySymbol}
                    {tier.price}
                  </span>
                  <span className="text-slate-400 text-sm">/{tier.billing_cycle}</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    initiateCheckout(tier.id);
                  }}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    isSelected || isPopular
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  Choose {tier.name}
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-slate-500 mb-3">Secure payment via</p>
          <div className="flex items-center justify-center gap-4">
            <span className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-xs">Paystack</span>
            <span className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-xs">Crypto (NOWPayments)</span>
            <span className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-xs">Bank Transfer</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
