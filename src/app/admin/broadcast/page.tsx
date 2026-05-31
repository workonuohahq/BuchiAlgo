"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Send, Users, Crown, AlertCircle, User } from "lucide-react";
import toast from "react-hot-toast";

type FilterType = "all" | "premium" | "non_verified" | "single_id";

interface BroadcastForm {
  message: string;
  filter: FilterType;
  singleId: string;
}

export default function BroadcastEngine() {
  const [form, setForm] = useState<BroadcastForm>({
    message: "",
    filter: "all",
    singleId: "",
  });
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);

  async function sendBroadcast() {
    if (!form.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (form.filter === "single_id" && !form.singleId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: form.message,
          filters: {
            type: form.filter,
            singleId: form.singleId || undefined,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Broadcast queued! ${data.recipientCount || 0} recipients`);
        setForm({ message: "", filter: "all", singleId: "" });
      } else {
        throw new Error(data.error || "Send failed");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const filters: { value: FilterType; label: string; icon: typeof Users; desc: string }[] = [
    { value: "all", label: "All Users", icon: Users, desc: "Broadcast to every registered user" },
    { value: "premium", label: "Premium Only", icon: Crown, desc: "Only active premium subscribers" },
    { value: "non_verified", label: "Non-Verified", icon: AlertCircle, desc: "Users who haven't completed verification" },
    { value: "single_id", label: "Single User", icon: User, desc: "Target a specific alphanumeric ID" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-400" />
          Broadcast Engine
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Send targeted messages to user segments via Telegram
        </p>
      </div>

      {/* Message Composer */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5"
      >
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Message Content
        </label>
        <textarea
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          rows={8}
          placeholder="Enter your broadcast message...&#10;Supports HTML formatting: <b>bold</b>, <i>italic</i>, <code>code</code>"
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">
            {form.message.length} characters
          </span>
          <button
            onClick={() => setPreview(!preview)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {preview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>

        <AnimatePresence>
          {preview && form.message && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800"
            >
              <p className="text-xs text-slate-500 mb-2">Preview:</p>
              <div
                className="text-sm text-slate-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: form.message }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recipient Filter */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-5"
      >
        <h3 className="text-sm font-medium text-slate-300 mb-4">Recipient Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = form.filter === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => setForm((prev) => ({ ...prev, filter: filter.value }))}
                className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
                  isActive
                    ? "border-blue-500/30 bg-blue-500/5"
                    : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                }`}
              >
                <Icon
                  className={`w-5 h-5 mt-0.5 ${isActive ? "text-blue-400" : "text-slate-500"}`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isActive ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {filter.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{filter.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {form.filter === "single_id" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4"
            >
              <label className="text-sm text-slate-300 mb-1.5 block">
                Target Alphanumeric ID
              </label>
              <input
                type="text"
                value={form.singleId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, singleId: e.target.value.toUpperCase() }))
                }
                placeholder="BUCHI-7X9R2"
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Send Action */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-end gap-4"
      >
        <div className="text-sm text-slate-400">
          Target: <span className="text-white font-medium capitalize">{form.filter.replace("_", " ")}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={sendBroadcast}
          disabled={sending || !form.message.trim()}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {sending ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Dispatching...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Broadcast
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
