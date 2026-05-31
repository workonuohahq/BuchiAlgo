"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Lock, Eye, EyeOff, Save, RefreshCw, Shield } from "lucide-react";
import toast from "react-hot-toast";

interface GatewayConfig {
  paystack_public: string;
  paystack_secret: string;
  paystack_webhook_secret: string;
  nowpayments_api_key: string;
  nowpayments_ipn_secret: string;
  manual_transfer_enabled: boolean;
  manual_bank_name: string;
  manual_account_number: string;
  manual_account_name: string;
  manual_instructions: string;
}

const DEFAULT_GATEWAYS: GatewayConfig = {
  paystack_public: "",
  paystack_secret: "",
  paystack_webhook_secret: "",
  nowpayments_api_key: "",
  nowpayments_ipn_secret: "",
  manual_transfer_enabled: true,
  manual_bank_name: "",
  manual_account_number: "",
  manual_account_name: "",
  manual_instructions: "",
};

export default function GatewayMatrix() {
  const [config, setConfig] = useState<GatewayConfig>(DEFAULT_GATEWAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch("/api/admin/config?key=payment_gateway_keys");
      const data = await res.json();
      if (data.value) {
        setConfig((prev) => ({ ...prev, ...data.value }));
      }
    } catch (err) {
      console.error("Failed to load gateway config:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "payment_gateway_keys", value: config }),
      });

      if (res.ok) {
        toast.success("Gateway configuration saved");
      } else {
        throw new Error("Save failed");
      }
    } catch {
      toast.error("Failed to save gateway config");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof GatewayConfig, value: string | boolean) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSecret(key: string) {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-400" />
            Gateway Matrix
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage payment gateways and API credentials
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setConfig(DEFAULT_GATEWAYS)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </motion.button>
        </div>
      </div>

      {/* Paystack */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Paystack</h3>
          <span className="badge-success ml-2">Active</span>
        </div>

        <div className="space-y-4">
          {[
            { key: "paystack_public" as const, label: "Public Key", placeholder: "pk_test_..." },
            { key: "paystack_secret" as const, label: "Secret Key", placeholder: "sk_test_..." },
            { key: "paystack_webhook_secret" as const, label: "Webhook Secret", placeholder: "whsec_..." },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm text-slate-300">{field.label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showSecrets[field.key] ? "text" : "password"}
                  value={config[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                />
                <button
                  onClick={() => toggleSecret(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showSecrets[field.key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* NOWPayments */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">NOWPayments (Crypto)</h3>
          <span className="badge-info ml-2">Web3</span>
        </div>

        <div className="space-y-4">
          {[
            { key: "nowpayments_api_key" as const, label: "API Key", placeholder: "your-api-key" },
            { key: "nowpayments_ipn_secret" as const, label: "IPN Secret", placeholder: "ipn-secret" },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm text-slate-300">{field.label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showSecrets[field.key] ? "text" : "password"}
                  value={config[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                />
                <button
                  onClick={() => toggleSecret(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showSecrets[field.key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Manual Bank Transfer */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Manual Bank Transfer</h3>
            <span className="badge-warning ml-2">Manual Verification</span>
          </div>
          <button
            onClick={() =>
              updateField("manual_transfer_enabled", !config.manual_transfer_enabled)
            }
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.manual_transfer_enabled ? "bg-blue-500" : "bg-slate-700"
            }`}
          >
            <motion.div
              animate={{ x: config.manual_transfer_enabled ? 24 : 2 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white"
            />
          </button>
        </div>

        {config.manual_transfer_enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Bank Name</label>
              <input
                type="text"
                value={config.manual_bank_name}
                onChange={(e) => updateField("manual_bank_name", e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Example Bank Ltd"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Account Number</label>
              <input
                type="text"
                value={config.manual_account_number}
                onChange={(e) => updateField("manual_account_number", e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Account Name</label>
              <input
                type="text"
                value={config.manual_account_name}
                onChange={(e) => updateField("manual_account_name", e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="BuchiAlgo Ltd"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-slate-300">Instructions for Users</label>
              <textarea
                value={config.manual_instructions}
                onChange={(e) => updateField("manual_instructions", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                placeholder="Transfer the exact amount and upload your receipt..."
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
