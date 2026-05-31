import Link from "next/link";
import { Cpu, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
          <Cpu className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
            BuchiAlgo
          </span>
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Institutional-grade quantitative trading analytics. 
          Pure mathematical precision. Zero AI hallucinations.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/checkout"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Admin Panel
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-600">
          Also available on Telegram — search for @BuchiAlgoBot
        </p>
      </div>
    </div>
  );
}
