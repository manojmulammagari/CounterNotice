"use client";

import { useState, useRef, useCallback } from "react";
import type { ExtractedFacts, Finding } from "@/lib/engine/types";
import type { DeadlineResult } from "@/lib/deadline/compute";

export interface ResponseLetterProps {
  text: string;
  source: "template" | "llm_polished";
  facts: ExtractedFacts;
  findings: Finding[];
  deadline?: DeadlineResult | null;
}

export default function ResponseLetter({
  text,
  source,
  facts,
  findings,
}: ResponseLetterProps) {
  const letterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — user can still select and copy manually
      setCopied(false);
    }
  }, [text]);

  const violationCount = findings.length;

  return (
    <>
      {/* Print-only styles — strips everything except the letter paper */}
      <style>{`
        @media print {
          @page { margin: 0.6in 0.5in 0.6in 0.5in; size: letter; }
          body { background: white !important; color: black !important; font-family: Georgia, "Times New Roman", serif !important; }
          body * { visibility: hidden; }
          #letter-print-root, #letter-print-root * { visibility: visible; }
          #letter-print-root { position: absolute; left: 0; top: 0; width: 100%; max-width: 8.5in; margin: 0; padding: 0; box-shadow: none !important; border: none !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          a { color: black !important; text-decoration: underline !important; }
          h1, h2, h3 { color: black !important; page-break-after: avoid; }
          p, ul, ol { orphans: 3; widows: 3; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      <section
        className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label="Response letter"
      >
        {/* Non-print toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">
              Your Response Letter
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                source === "llm_polished"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {source === "llm_polished" ? "Polished by AI" : "Written by you"}
            </span>
            {violationCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                {violationCount} problem{violationCount > 1 ? "s" : ""} cited
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="no-print inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition-transform hover:bg-slate-50 active:scale-[0.98]"
              aria-label="Copy letter text"
            >
              {copied ? "Copied!" : "📋 Copy text"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="no-print inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:bg-slate-800 active:scale-[0.98]"
              aria-label="Print or save as PDF"
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        {/* The paper */}
        <div
          id="letter-print-root"
          ref={letterRef}
          className="mx-auto max-w-[680px] bg-white px-6 py-8 font-serif text-[15px] leading-[1.75] text-slate-800 sm:px-10 sm:py-12"
        >
          {/* Header stamp */}
          <div className="mb-8 border-b-2 border-slate-900 pb-4">
            <p className="mb-1 font-sans text-xs font-bold uppercase tracking-widest text-slate-500">
              CounterNotice — Legal Information Tool — Not Legal Advice
            </p>
            <p className="font-sans text-xs text-slate-400">
              Notice date:{" "}
              {facts.date_issued
                ? new Date(facts.date_issued + "T12:00:00Z").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )
                : "Not identified"}{" "}
              • State: {facts.state || "Not identified"} • Notice type:{" "}
              {facts.notice_type || "Unknown"}
            </p>
          </div>

          {/* Letter body — line-by-line render */}
          <div className="text-[15px] leading-[1.8] text-slate-900">
            {text.split("\n").map((line, i) => {
              const trimmed = line.trim();

              if (trimmed === "---") {
                return <hr key={i} className="my-5 border-t border-slate-300" />;
              }

              const isSubheading =
                trimmed.startsWith("RE:") ||
                trimmed.startsWith("Dear ") ||
                trimmed.startsWith("Sincerely") ||
                trimmed.startsWith("IMPORTANT") ||
                trimmed.startsWith("WHAT THIS");

              if (isSubheading) {
                return (
                  <h3
                    key={i}
                    className="mb-3 mt-6 font-sans text-base font-extrabold text-slate-900"
                  >
                    {line}
                  </h3>
                );
              }

              if (trimmed === "") {
                return <div key={i} className="h-3" />;
              }

              return (
                <p key={i} className="mb-3">
                  {line}
                </p>
              );
            })}
          </div>

          {/* Footer stamp */}
          <div className="mt-10 border-t border-slate-200 pt-4 font-sans text-xs text-slate-400">
            <p>Document generated by CounterNotice.</p>
            <p>
              Every citation links back to the official Texas Legislature website.
            </p>
            <p>This is not a lawyer. It is a computer program that reads state laws.</p>
          </div>
        </div>
      </section>
    </>
  );
}