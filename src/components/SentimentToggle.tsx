"use client";

import { ShieldCheck, ShieldOff } from "lucide-react";

interface SentimentToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function SentimentToggle({ enabled, onChange }: SentimentToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        enabled
          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
      }`}
    >
      {enabled ? (
        <ShieldCheck className="h-3.5 w-3.5" />
      ) : (
        <ShieldOff className="h-3.5 w-3.5" />
      )}
      情绪过滤 {enabled ? "开" : "关"}
    </button>
  );
}
