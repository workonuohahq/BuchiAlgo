"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Palette, Save, Globe, Type, MessageSquare, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface BrandingConfig {
  platform_name: string;
  platform_initials: string;
  default_currency: string;
  currency_symbol: string;
  support_url: string;
  support_telegram: string;
  welcome_message: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  platform_name: "BuchiAlgo",
  platform_initials: "BUCHI",
  default_currency: "USD",
  currency_symbol: "$",
  support_url: "https://t.me/BuchiAlgoSupport",
  support_telegram: "@BuchiAlgoSupport",
  welcome_message:
    "Welcome to BuchiAlgo — your institutional-grade quantitative trading analytics engine. Every signal is derived from pure mathematical structures, zero AI hallucinations.",
};

export default function BrandingConfig() {
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const keys = [
        "platform_name",
        "platform_initials",
        "default_currency",
        "currency_symbol",
        "support_url",
        "support_telegram",
        "welcome_message",
      ];

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`/api/admin/config`);
      const data = await res.json();

      if (data.configs) {
        const loaded: Partial<BrandingConfig> = {};
        for (const cfg of data.configs) {
          if (keys.includes(cfg.key) && cfg.value !== undefined) {
            try {
              loaded[cfg.key as keyof BrandingConfig] =
                typeof cfg.value === "string" ? JSON.parse(cfg.value) : cfg.value;
            } catch {
              loaded[cfg.key as keyof BrandingConfig] = cfg.value;
            }
          }
        }
        setConfig((prev) => ({ ...prev, ...loaded }));
      }
    } catch (err) {
      console.error("Failed to load branding config:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const promises = Object.entries(config).map(([key, value]) =>
        fetch("/api/admin/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        })
      );

      await Promise.all(promises);
      toast.success("Branding configuration saved");
    } catch {
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof BrandingConfig, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function resetDefaults() {
    setConfig(DEFAULT_BRANDING);
    toast.success("Reset to defaults");
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
            <Palette className="w-6 h-6 text-blue-400" />
            Branding & Global Copy
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure platform identity, messaging, and currency settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save All"}
          </motion.button>
        </div>
      </div>

      {/* Brand Identity */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Brand Identity</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Platform Name</label>
            <input
              type="text"
              value={config.platform_name}
              onChange={(e) => updateField("platform_name", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <p className="text-xs text-slate-500">
              Displayed throughout the application
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Platform Initials</label>
            <input
              type="text"
              value={config.platform_initials}
              onChange={(e) => updateField("platform_initials", e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              maxLength={6}
            />
            <p className="text-xs text-slate-500">
              Used for ID prefixes (e.g., BUCHI-7X9R2)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Default Currency</label>
            <select
              value={config.default_currency}
              onChange={(e) => updateField("default_currency", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="NGN">NGN — Nigerian Naira</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Currency Symbol</label>
            <input
              type="text"
              value={config.currency_symbol}
              onChange={(e) => updateField("currency_symbol", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              maxLength={3}
            />
          </div>
        </div>
      </motion.div>

      {/* Support & Links */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Support & Links</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Support Telegram Handle</label>
            <input
              type="text"
              value={config.support_telegram}
              onChange={(e) => updateField("support_telegram", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="@BuchiAlgoSupport"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Support URL</label>
            <input
              type="text"
              value={config.support_url}
              onChange={(e) => updateField("support_url", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="https://t.me/BuchiAlgoSupport"
            />
          </div>
        </div>
      </motion.div>

      {/* Messaging */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Welcome Message</h3>
        </div>

        <div className="space-y-2">
          <textarea
            value={config.welcome_message}
            onChange={(e) => updateField("welcome_message", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
          <p className="text-xs text-slate-500">
            First message users see when interacting with the bot. Keep it concise and engaging.
          </p>
        </div>
      </motion.div>

      {/* Live Preview */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-5 border-blue-500/20"
      >
        <h3 className="text-sm font-semibold text-white mb-4">Live Preview</h3>
        <div className="bg-slate-950 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Platform:</span>
            <span className="text-white font-bold">{config.platform_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">User ID Example:</span>
            <span className="font-mono text-sm text-blue-400">
              {config.platform_initials}-7X9R2
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Price Display:</span>
            <span className="text-white">
              {config.currency_symbol}29.99 / month
            </span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <p className="text-sm text-slate-300">{config.welcome_message}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
