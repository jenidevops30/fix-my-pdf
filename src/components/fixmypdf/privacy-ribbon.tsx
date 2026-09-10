"use client";

import { ShieldCheck } from "lucide-react";

export function PrivacyRibbon() {
  return (
    <section
      aria-label="Privacy promise"
      className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <ShieldCheck className="size-5 text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-bold">Your documents stay in your browser</h4>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            Files are processed in a sandboxed in-browser engine (WebAssembly). Zero bytes are
            uploaded to any server.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6 font-mono text-xs text-slate-500 shrink-0">
        <span>
          <strong className="text-slate-900 font-semibold">0 ms</strong> cloud delay
        </span>
        <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
        <span>
          <strong className="text-slate-900 font-semibold">0 bytes</strong> logged
        </span>
      </div>
    </section>
  );
}
