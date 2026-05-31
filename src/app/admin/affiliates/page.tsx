"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle, XCircle, Clock, DollarSign, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface AffiliateApplication {
  id: string;
  user_id: string;
  alphanumeric_id: string;
  telegram_id: number;
  form_data: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
}

interface PayoutRequest {
  id: string;
  affiliate_id: string;
  alphanumeric_id: string;
  amount: number;
  status: "pending" | "paid";
  routing_data: Record<string, string>;
  created_at: string;
}

export default function AffiliateHub() {
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"applications" | "payouts">("applications");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [appsRes, payoutsRes] = await Promise.all([
        fetch("/api/admin/affiliates"),
        fetch("/api/admin/payouts"),
      ]);

      const appsData = await appsRes.json();
      const payoutsData = await payoutsRes.json();

      setApplications(appsData.applications || []);
      setPayouts(payoutsData.payouts || []);
    } catch (err) {
      console.error("Failed to load affiliate data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateApplication(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success(`Application ${status}`);
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } catch {
      toast.error("Update failed");
    }
  }

  async function processPayout(id: string) {
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "paid" }),
      });

      if (res.ok) {
        toast.success("Payout processed");
        setPayouts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "paid" as const } : p))
        );
      }
    } catch {
      toast.error("Payout failed");
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

  const pendingApps = applications.filter((a) => a.status === "pending");
  const approvedApps = applications.filter((a) => a.status === "approved");
  const rejectedApps = applications.filter((a) => a.status === "rejected");
  const pendingPayouts = payouts.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          Affiliate Hub
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage affiliate applications and payout requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Apps", value: pendingApps.length, color: "amber", icon: Clock },
          { label: "Approved", value: approvedApps.length, color: "emerald", icon: CheckCircle },
          { label: "Rejected", value: rejectedApps.length, color: "red", icon: XCircle },
          { label: "Pending Payouts", value: pendingPayouts.length, color: "blue", icon: DollarSign },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 text-${stat.color}-400`} />
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        {(["applications", "payouts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-blue-500/20 text-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "applications" ? "Applications" : "Payout Requests"}
          </button>
        ))}
      </div>

      {/* Applications Kanban */}
      <AnimatePresence mode="wait">
        {activeTab === "applications" && (
          <motion.div
            key="applications"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Pending Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                <Clock className="w-4 h-4" />
                Pending ({pendingApps.length})
              </div>
              {pendingApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onApprove={() => updateApplication(app.id, "approved")}
                  onReject={() => updateApplication(app.id, "rejected")}
                />
              ))}
            </div>

            {/* Approved Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Approved ({approvedApps.length})
              </div>
              {approvedApps.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>

            {/* Rejected Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                <XCircle className="w-4 h-4" />
                Rejected ({rejectedApps.length})
              </div>
              {rejectedApps.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "payouts" && (
          <motion.div
            key="payouts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {payouts.map((payout) => (
              <motion.div
                key={payout.id}
                layout
                className="glass-panel p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      payout.status === "pending"
                        ? "bg-amber-500/10"
                        : "bg-emerald-500/10"
                    }`}
                  >
                    <DollarSign
                      className={`w-5 h-5 ${
                        payout.status === "pending"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {payout.alphanumeric_id}
                    </p>
                    <p className="text-xs text-slate-400">
                      ${payout.amount.toFixed(2)} —{" "}
                      {payout.routing_data?.method || "Bank Transfer"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`badge-${
                      payout.status === "pending" ? "warning" : "success"
                    }`}
                  >
                    {payout.status}
                  </span>
                  {payout.status === "pending" && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => processPayout(payout.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      Pay <ArrowRight className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ApplicationCard({
  app,
  onApprove,
  onReject,
}: {
  app: AffiliateApplication;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={`glass-panel p-4 border ${
        app.status === "pending"
          ? "border-amber-500/20"
          : app.status === "approved"
          ? "border-emerald-500/20"
          : "border-red-500/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">
          {app.alphanumeric_id}
        </span>
        <span
          className={`badge-${
            app.status === "pending"
              ? "warning"
              : app.status === "approved"
              ? "success"
              : "danger"
          } text-[10px]`}
        >
          {app.status}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-2">ID: {app.telegram_id}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-400 hover:text-blue-300 mb-2"
      >
        {expanded ? "Hide Details" : "View Details"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1.5 mb-3"
          >
            {Object.entries(app.form_data).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-slate-500 capitalize">{key}:</span>{" "}
                <span className="text-slate-300">{value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {app.status === "pending" && onApprove && onReject && (
        <div className="flex items-center gap-2 mt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            Approve
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            <XCircle className="w-3 h-3" />
            Reject
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
