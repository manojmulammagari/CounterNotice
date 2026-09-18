"use client";

import type { EvaluationResult } from "@/lib/engine/types";
import { useVoicePlayer, voiceKeyForResult } from "@/lib/voice/player";

// ── Tone ────────────────────────────────────────────────────────────────────

type Tone = "danger" | "caution" | "ok" | "info";

function getTone(result: EvaluationResult): Tone {
  if (result.kind !== "evaluated") return "info";
  if (result.violations.length > 0) return "danger";
  if (result.unknowns.length > 0 || result.needs_human_review) return "caution";
  return "ok";
}

const TONE_STYLES: Record<Tone, { bg: string; border: string; icon: string }> = {
  danger:  { bg: "bg-red-50",     border: "border-red-200",   icon: "⚠️" },
  caution: { bg: "bg-amber-50",   border: "border-amber-200", icon: "🔍" },
  ok:      { bg: "bg-emerald-50", border: "border-emerald-200", icon: "✓" },
  info:    { bg: "bg-slate-100",  border: "border-slate-300", icon: "ℹ️" },
};

// ── Title / body helpers ─────────────────────────────────────────────────────

function getTitle(result: EvaluationResult): string {
  if (result.kind === "evaluated") return result.headline;
  if (result.kind === "out_of_jurisdiction") return "We only check Texas notices";
  return "We could not tell what this paper is";
}

function getBody(result: EvaluationResult): string | null {
  if (result.kind === "evaluated") {
    const n = result.findings.length;
    return `We checked ${n} rule${n === 1 ? "" : "s"} from Texas Property Code § 24.005.`;
  }
  return result.message;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VerdictCard({ result }: { result: EvaluationResult }) {
  const tone = getTone(result);
  const { bg, border, icon } = TONE_STYLES[tone];
  const title = getTitle(result);
  const body = getBody(result);

  const { play, playing } = useVoicePlayer();
  const voiceKey = voiceKeyForResult(
    result.kind,
    result.kind === "evaluated" ? result.violations.length : 0,
    result.kind === "evaluated" ? result.unknowns.length : 0
  );
  
  // Use the exact engine headline if possible, otherwise message
  const phraseText = result.kind === "evaluated" 
    ? result.headline 
    : (result as Record<string, string>).message || "CounterNotice result.";

  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border ${border} ${bg} p-5 shadow-sm`}
    >
      {/* Icon + headline */}
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">{icon}</span>
        <h2 className="text-lg font-extrabold leading-snug text-slate-900">
          {title}
        </h2>
      </div>

      {/* Body */}
      {body && (
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p>
      )}

      {/* Disclaimer */}
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {result.disclaimer}
      </p>

      {/* Read-aloud button */}
      <button
        type="button"
        onClick={() => play(voiceKey, phraseText)}
        disabled={playing}
        className="no-print mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm transition-transform hover:bg-amber-200 active:scale-[0.98] disabled:opacity-60"
        aria-label="Read this verdict aloud"
      >
        {playing ? "Speaking..." : "🔊 Read my rights aloud"}
      </button>
    </section>
  );
}