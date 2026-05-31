"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  Zap,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  totalRevenue: number;
  scansToday: number;
  activeScans: number;
  pendingTransactions: number;
  userGrowth: number;
  revenueGrowth: number;
  recentUsers: Array<{
    id: string;
    alphanumeric_id: string;
    telegram_id: number;
    is_premium: boolean;
    scan_credits: number;
    created_at: string;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    status: string;
    provider_type: string;
    created_at: string;
  }>;
  activityData: Array<{ time: string; scans: number; users: number }>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
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

  const metrics = [
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "blue",
      growth: stats?.userGrowth || 0,
    },
    {
      label: "Premium Users",
      value: stats?.premiumUsers || 0,
      icon: Crown,
      color: "amber",
      growth: null,
    },
    {
      label: "Total Revenue",
      value: `$${(stats?.totalRevenue || 0).toFixed(2)}`,
      icon: CreditCard,
      color: "emerald",
      growth: stats?.revenueGrowth || 0,
    },
    {
      label: "Scans Today",
      value: stats?.scansToday || 0,
      icon: Activity,
      color: "purple",
      growth: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Real-time system overview and key performance metrics
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          const colorMap: Record<string, string> = {
            blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          };

          return (
            <motion.div
              key={metric.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className={`glass-panel p-5 ${colorMap[metric.color]}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  {metric.growth !== null && (
                    <div
                      className={`flex items-center gap-1 text-xs ${
                        metric.growth >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {metric.growth >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {Math.abs(metric.growth)}%
                    </div>
                  )}
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${colorMap[metric.color]}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-panel p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Activity Overview</h3>
            <Zap className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats?.activityData || []}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                }}
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorScans)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorUsers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Recent Users</h3>
          <div className="space-y-3">
            {(stats?.recentUsers || []).map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {user.alphanumeric_id}
                  </p>
                  <p className="text-xs text-slate-400">ID: {user.telegram_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.is_premium && (
                    <span className="badge-info text-[10px]">
                      <Crown className="w-3 h-3 mr-1 inline" />
                      PRO
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {user.scan_credits} cr
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
