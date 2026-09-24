"use client";

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-slate-400">Please retry the request.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
