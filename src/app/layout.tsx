// ============================================================
// ROOT LAYOUT — wraps all pages with providers
// ============================================================

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";


export const metadata: Metadata = {
  title: "BuchiAlgo — Quantitative Trading Analytics",
  description:
    "Institutional-grade deterministic trading analysis engine. Pure mathematical precision, zero AI hallucinations.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
