"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Save, RotateCcw, Sliders, Gauge, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

interface MathParams {
  lookback_period: number;
  swing_lookback: number;
  fvg_min_size_pct: number;
  fvg_max_age_candles: number;
  ob_volume_multiplier: number;
  ob_lookback: number;
  atr_multiplier_sl: number;
  atr_multiplier_tp1: number;
  atr_multiplier_tp2: number;
  atr_multiplier_tp3: number;
  mss_breakout_threshold: number;
  volume_ma_period: number;
  enable_fvg: boolean;
  enable_ifvg: boolean;
  enable_ob: boolean;
  enable_mss: boolean;
  quarter_rounding_precision: number;
  min_candles_required: number;
}

const DEFAULT_PARAMS: MathParams = {
  lookback_period: 200,
  swing_lookback: 5,
  fvg_min_size_pct: 0.15,
  fvg_max_age_candles: 50,
  ob_volume_multiplier: 1.5,
  ob_lookback: 3,
  atr_multiplier_sl: 1.5,
  atr_multiplier_tp1: 2.0,
  atr_multiplier_tp2: 3.5,
  atr_multiplier_tp3: 5.0,
  mss_breakout_threshold: 0.5,
  volume_ma_period: 20,
  enable_fvg: true,
  enable_ifvg: true,
  enable_ob: true,
  enable_mss: true,
  quarter_rounding_precision: 2,
  min_candles_required: 50,
};

export default function AlgorithmMatrix() {
  const [params, setParams] = useState<MathParams>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadParams();
  }, []);

  async function loadParams() {
    try {
      const res = await fetch("/api/admin/config?key=math_parameters");
      const data = await res.json();
      if (data.value) {
        setParams({ ...DEFAULT_PARAMS, ...data.value });
      }
    } catch (err) {
      console.error("Failed to load params:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveParams() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "math_parameters", value: params }),
      });

      if (res.ok) {
        toast.success("Algorithm parameters updated");
      } else {
        throw new Error("Save failed");
      }
    } catch {
      toast.error("Failed to save parameters");
    } finally {
      setSaving(false);
    }
  }

  function resetParams() {
    setParams(DEFAULT_PARAMS);
    toast.success("Parameters reset to defaults");
  }

  function updateParam(key: keyof MathParams, value: number | boolean) {
    setParams((prev) => ({ ...prev, [key]: value }));
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

  const sections = [
    {
      title: "Lookback & Detection",
      icon: Sliders,
      params: [
        { key: "lookback_period" as const, label: "Lookback Period", min: 50, max: 500, step: 10, desc: "Candles to analyze" },
        { key: "swing_lookback" as const, label: "Swing Lookback", min: 2, max: 20, step: 1, desc: "Swing point detection window" },
        { key: "min_candles_required" as const, label: "Min Candles Required", min: 10, max: 100, step: 5, desc: "Minimum for valid analysis" },
      ],
    },
    {
      title: "Fair Value Gap (FVG)",
      icon: Gauge,
      params: [
        { key: "fvg_min_size_pct" as const, label: "Min FVG Size %", min: 0.01, max: 2.0, step: 0.01, desc: "Minimum gap size as %" },
        { key: "fvg_max_age_candles" as const, label: "Max FVG Age", min: 10, max: 200, step: 5, desc: "Max age in candles" },
      ],
      toggle: { key: "enable_fvg" as const, label: "Enable FVG Detection" },
    },
    {
      title: "Order Block (OB)",
      icon: Sliders,
      params: [
        { key: "ob_volume_multiplier" as const, label: "Volume Multiplier", min: 0.5, max: 5.0, step: 0.1, desc: "OB volume vs average" },
        { key: "ob_lookback" as const, label: "OB Lookback", min: 1, max: 10, step: 1, desc: "Candles before breakout" },
      ],
      toggle: { key: "enable_ob" as const, label: "Enable Order Blocks" },
    },
    {
      title: "Market Structure (MSS)",
      icon: Gauge,
      params: [
        { key: "mss_breakout_threshold" as const, label: "Breakout Threshold %", min: 0.1, max: 5.0, step: 0.1, desc: "Swing breakout sensitivity" },
        { key: "volume_ma_period" as const, label: "Volume MA Period", min: 5, max: 50, step: 5, desc: "Volume moving average" },
      ],
      toggle: { key: "enable_mss" as const, label: "Enable MSS Detection" },
    },
    {
      title: "OIE & Risk Parameters",
      icon: Sliders,
      params: [
        { key: "atr_multiplier_sl" as const, label: "ATR Multiplier (SL)", min: 0.5, max: 5.0, step: 0.1, desc: "Stop Loss ATR multiplier" },
        { key: "atr_multiplier_tp1" as const, label: "ATR Multiplier (TP1)", min: 1.0, max: 10.0, step: 0.5, desc: "Take Profit 1 ATR multiplier" },
        { key: "atr_multiplier_tp2" as const, label: "ATR Multiplier (TP2)", min: 1.0, max: 15.0, step: 0.5, desc: "Take Profit 2 ATR multiplier" },
        { key: "atr_multiplier_tp3" as const, label: "ATR Multiplier (TP3)", min: 1.0, max: 20.0, step: 0.5, desc: "Take Profit 3 ATR multiplier" },
        { key: "quarter_rounding_precision" as const, label: "Quarter Precision", min: 0, max: 4, step: 1, desc: "Decimal places for rounding" },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            Algorithm Matrix
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Fine-tune the deterministic quantitative math engine parameters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetParams}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveParams}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </motion.button>
        </div>
      </div>

      {/* Strategy Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4">Strategy Toggles</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "enable_fvg" as const, label: "FVG Detection", color: "blue" },
            { key: "enable_ifvg" as const, label: "Inverse FVG", color: "purple" },
            { key: "enable_ob" as const, label: "Order Blocks", color: "amber" },
            { key: "enable_mss" as const, label: "Market Structure", color: "emerald" },
          ].map((toggle) => (
            <div
              key={toggle.key}
              className={`p-4 rounded-lg border ${
                params[toggle.key]
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-slate-700 bg-slate-800/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{toggle.label}</span>
                <button
                  onClick={() => updateParam(toggle.key, !params[toggle.key])}
                  className="relative"
                >
                  {params[toggle.key] ? (
                    <ToggleRight className="w-8 h-8 text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Parameter Sections */}
      <AnimatePresence>
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.params.map((param) => (
                  <div key={param.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-300">{param.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={params[param.key]}
                          onChange={(e) =>
                            updateParam(param.key, parseFloat(e.target.value) || 0)
                          }
                          step={param.step}
                          className="w-20 px-2 py-1 text-right bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={params[param.key]}
                      onChange={(e) =>
                        updateParam(param.key, parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <p className="text-xs text-slate-500">{param.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
