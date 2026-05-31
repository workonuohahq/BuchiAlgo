"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Deep analytics and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Scans", value: "12,847", change: "+23%", icon: Activity },
          { label: "Conversion Rate", value: "3.2%", change: "+0.5%", icon: TrendingUp },
          { label: "Avg. Session", value: "4m 32s", change: "+12%", icon: PieChart },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-slate-400">{metric.label}</span>
              </div>
              <p className="text-3xl font-bold text-white">{metric.value}</p>
              <p className="text-sm text-emerald-400 mt-1">{metric.change} this month</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel p-8 text-center"
      >
        <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">
          Advanced Analytics Coming Soon
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Full analytics dashboard with cohort analysis, retention curves, and 
          revenue attribution is under development.
        </p>
      </motion.div>
    </div>
  );
}
