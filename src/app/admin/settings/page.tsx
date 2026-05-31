"use client";

import { motion } from "framer-motion";
import { Settings, Shield, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          System configuration and maintenance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Shield,
            title: "Security",
            desc: "API keys, webhook secrets, and access controls",
            status: "Configured",
          },
          {
            icon: Bell,
            title: "Notifications",
            desc: "Telegram bot alerts and admin notifications",
            status: "Active",
          },
          {
            icon: Database,
            title: "Database",
            desc: "Connection status and migration controls",
            status: "Connected",
          },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-5 flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                <span className="badge-success mt-2 text-[10px]">{item.status}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
