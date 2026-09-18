"use client";

import type { Finding, ExtractedFacts, Ruleset } from "@/lib/engine/types";
import { HighlightedText } from "@/components/HighlightedText";
import rulesetJson from "@/lib/rules/tx-24-005.rules.json";

// Cast — DO NOT edit the JSON, read only
const RULESET = rulesetJson as unknown as Ruleset;

// ── Clause label mapping ─────────────────────────────────────────────────────

const RULE_TO_CLAUSE_LABELS: Record<string, string[]> = {
  "TX-24.005-1": ["notice_period"],
  "TX-24.005-2": ["delivery_method"],
  "TX-24.005-3": ["demand_for_possession"],
};

// ── Severity chip ────────────────────────────────────────────────────────────

const SEVERITY_LABELS: Record<string, string> = {
  fatal:   "Most serious problem",
  serious: "Serious problem",
  minor:   "Smaller problem",
};

const SEVERITY_CHIP: Record<string, string> = {
  fatal:   "bg-red-100 text-red-900",
  serious: "bg-orange-100 text-orange-900",
  minor:   "bg-yellow-100 text-yellow-900",
};

// ── Per-finding card ─────────────────────────────────────────────────────────

function FindingCard({
  finding,
  facts,
}: {
  finding: Finding;
  facts: ExtractedFacts;
}) {
  // Find the relevant clause text from the notice
  const labelKeys = RULE_TO_CLAUSE_LABELS[finding.rule_id] ?? [];
  const matchedClause = facts.clauses.find((c) =>
    labelKeys.some((key) => c.label.toLowerCase().includes(key)),
  );
  const clauseText = matchedClause?.text ?? finding.notice_evidence ?? null;

  // Find matching ruleset rule for exceptions
  const rulesetRule = RULESET.rules.find((r) => r.id === finding.rule_id);
  const exceptions = rulesetRule?.exceptions ?? [];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      {/* Header band */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${SEVERITY_CHIP[finding.severity] ?? "bg-slate-100 text-slate-900"}`}
        >
          {SEVERITY_LABELS[finding.severity] ?? finding.severity}
        </span>
        <h3 className="text-sm font-bold text-slate-900">{finding.title}</h3>
      </header>

      {/* Two-column diff */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* Left: notice text */}
        <div className="border-b border-slate-100 p-5 sm:border-b-0 sm:border-r">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            What your notice says
          </p>
          {clauseText ? (
            <p className="text-base leading-relaxed text-slate-800">
              <HighlightedText text={clauseText} />
            </p>
          ) : (
            <p className="text-sm italic text-slate-500">
              We could not find these exact words in the photo.
            </p>
          )}
        </div>

        {/* Right: statute text */}
        <div className="bg-blue-50/50 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
            What Texas law says
          </p>
          {finding.statute.quote ? (
            <>
              <blockquote className="text-base leading-relaxed text-slate-800">
                <HighlightedText text={`\u201c${finding.statute.quote}\u201d`} />
              </blockquote>
              <cite className="mt-2 block text-xs not-italic text-slate-500">
                {finding.statute.cite}
                {finding.statute.subsection ? `, ${finding.statute.subsection}` : ""}
              </cite>
            </>
          ) : (
            <p className="text-sm italic text-slate-500">
              This rule is pending attorney review. See the Texas statutes site for details.
            </p>
          )}
          {finding.statute.url && (
            <a
              href={finding.statute.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-blue-700 underline"
            >
              Read the law on the Texas Legislature site ↗
            </a>
          )}
        </div>
      </div>

      {/* Footer: plain language */}
      <footer className="border-t border-slate-100 px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-700">{finding.plain_language}</p>

        {/* Exception notes */}
        {exceptions.length > 0 && (
          <div className="mt-3 space-y-2">
            {exceptions.map((ex, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
              >
                <strong>This can change:</strong> {ex.when}. Then {ex.effect}.
              </div>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function WhyPanel({
  findings,
  facts,
}: {
  findings: Finding[];
  facts: ExtractedFacts;
}) {
  if (findings.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          🔎 Why we think so — your words next to the law
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Left: words from your notice. Right: the exact words of the Texas law.
          Yellow marks the parts that matter.
        </p>
      </div>

      {/* Cards */}
      {findings.map((f) => (
        <FindingCard key={f.rule_id} finding={f} facts={facts} />
      ))}
    </section>
  );
}