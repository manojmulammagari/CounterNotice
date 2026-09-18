"use client";

import { useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/api/types";
import type { ExtractedFacts, EvaluationResult } from "@/lib/engine/types";
import type { DeadlineResult } from "@/lib/deadline/compute";
import { VerdictCard } from "@/components/VerdictCard";
import { DeadlineShield } from "@/components/DeadlineShield";
import { WhyPanel } from "@/components/WhyPanel";

// ── Sample chips ─────────────────────────────────────────────────────────────

const SAMPLES = [
  { fixture: "defective",        label: "2-day notice, taped on the door" },
  { fixture: "clean",            label: "Clean 3-day notice" },
  { fixture: "lease_override",   label: "Lease says 2 days" },
  { fixture: "unreadable",       label: "Blurry photo" },
  { fixture: "out_of_state",     label: "Notice from Florida" },
  { fixture: "posted_and_mailed",label: "Posted and also mailed" },
  { fixture: "unknown_type",     label: "Unrecognized paper" },
] as const;

// ── State machine ────────────────────────────────────────────────────────────

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: { evaluation: EvaluationResult; facts: ExtractedFacts; deadline: DeadlineResult | null } }
  | { status: "error"; message: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function callAnalyze(body: Record<string, unknown>): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<AnalyzeResponse>;
}

// ── Results component ────────────────────────────────────────────────────────

function Results({
  data,
  onReset,
}: {
  data: { evaluation: EvaluationResult; facts: ExtractedFacts; deadline: DeadlineResult | null };
  onReset: () => void;
}) {
  const ev = data.evaluation;
  return (
    <div className="space-y-5">
      <VerdictCard result={ev} />
      {ev.kind === "evaluated" && <DeadlineShield deadline={data.deadline} />}
      {ev.kind === "evaluated" && ev.violations.length > 0 && (
        <WhyPanel findings={ev.violations} facts={data.facts} />
      )}
      {ev.kind === "evaluated" && ev.unknowns.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-900">What we could not check</h2>
          <ul className="mt-3 space-y-2">
            {ev.unknowns.map((f) => (
              <li key={f.rule_id} className="text-sm leading-relaxed text-amber-900">
                • <strong>{f.title}.</strong> {f.explanation}
              </li>
            ))}
          </ul>
        </section>
      )}
      {ev.kind === "evaluated" && ev.passes.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-slate-900">
            What we checked and did not find a problem with ({ev.passes.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {ev.passes.map((f) => (
              <li key={f.rule_id} className="text-sm text-slate-600">
                ✓ {f.title}
              </li>
            ))}
          </ul>
        </details>
      )}
      <button
        type="button"
        onClick={onReset}
        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-800 transition hover:bg-slate-50 active:scale-95"
      >
        Check another notice
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [state, setState] = useState<PageState>({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze(body: Record<string, unknown>) {
    setState({ status: "loading" });
    try {
      const [resp] = await Promise.all([callAnalyze(body), sleep(700)]);
      if (!resp.ok) {
        setState({ status: "error", message: resp.error });
        return;
      }
      setState({
        status: "done",
        data: {
          evaluation: resp.evaluation,
          facts: resp.facts,
          deadline: resp.deadline,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setState({ status: "error", message: msg });
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result as string;
        // Strip the "data:image/...;base64," prefix — take only what is after the comma
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        void analyze({ mode: "live", imageBase64: base64 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not read the photo.";
        setState({ status: "error", message: msg });
      }
    };
    reader.onerror = () => setState({ status: "error", message: "Could not read the file." });
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
            CounterNotice
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Crumpled paper to cited defense in 20 seconds. Built for LexHack 2026.
          </p>
        </header>

        {/* Idle */}
        {state.status === "idle" && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-3xl font-extrabold text-slate-900">
                Got an eviction notice?
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Take a photo. We read it and check it against Texas law in about 20
                seconds. Free. No sign-up.
              </p>

              {/* Photo button */}
              <label className="mt-5 block">
                <span className="flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-700 active:scale-95">
                  📷 Take or choose a photo
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleFile}
                />
              </label>
              <p className="mt-3 text-xs text-slate-500">
                Photo reading needs an internet connection. On stage or offline? Use a
                sample below.
              </p>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-500">
                Try a sample notice
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Sample chips */}
            <div className="grid grid-cols-2 gap-3">
              {SAMPLES.map((s) => (
                <button
                  key={s.fixture}
                  type="button"
                  onClick={() => void analyze({ mode: "demo", fixture: s.fixture })}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-white active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Loading */}
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-5 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="text-lg font-bold text-slate-800">Reading your notice…</p>
            <p className="text-sm text-slate-500">
              We are checking it against Texas law.
            </p>
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-red-900">We hit a problem</h2>
            <p className="mt-2 text-sm text-red-800">{state.message}</p>
            <button
              type="button"
              onClick={() => setState({ status: "idle" })}
              className="mt-4 min-h-[44px] w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-bold text-white transition hover:bg-slate-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Done */}
        {state.status === "done" && (
          <Results
            data={state.data}
            onReset={() => setState({ status: "idle" })}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-500">
          CounterNotice gives legal information, not legal advice. It is not a lawyer
          and cannot go to court for you. Built for LexHack 2026.
        </footer>
      </div>
    </div>
  );
}