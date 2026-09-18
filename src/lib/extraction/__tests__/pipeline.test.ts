import { describe, it, expect } from "vitest";
import { evaluateNotice } from "@/lib/engine/evaluate";
import type { Ruleset } from "@/lib/engine/types";
import {
  ALL_MOCKS,
  mockExtractNotice,
} from "@/lib/extraction/mock";
import ruleset from "@/lib/rules/tx-24-005.rules.json";

// Cast the imported JSON to the engine's Ruleset type.
// The engine tests already validated the JSON is structurally correct.
const txRuleset = ruleset as unknown as Ruleset;

// ── Helper: run extraction fixture through the real engine ──────────

function pipelineRun(fixtureName: keyof typeof ALL_MOCKS) {
  const facts = mockExtractNotice(fixtureName); // deep copy
  return evaluateNotice(facts, txRuleset);
}

// ══════════════════════════════════════════════════════════════════════
// PIPELINE TESTS
// These MUST mirror the Step 1 engine tests one-to-one.
// If engine test N passes, pipeline test N must also pass.
// ══════════════════════════════════════════════════════════════════════

describe("End-to-end pipeline: mock extraction → evaluateNotice", () => {
  // ── Pipeline Test 1: Defective notice → 2 fatal violations ──────
  it("defective notice → exactly 2 violations, both fatal", () => {
    const result = pipelineRun("defective");
    expect(result.kind).toBe("evaluated");
    if (result.kind === "evaluated") {
      expect(result.violations).toHaveLength(2);
      for (const v of result.violations) {
        expect(v.severity).toBe("fatal");
      }
      expect(result.headline).toContain("2");
      expect(result.disclaimer).toBeTruthy();
      expect(result.disclaimer.length).toBeGreaterThan(20);
    }
  });

  // ── Pipeline Test 2: Clean notice → 0 violations ────────────────
  it("clean notice → 0 violations, honest headline", () => {
    const result = pipelineRun("clean");
    expect(result.kind).toBe("evaluated");
    if (result.kind === "evaluated") {
      expect(result.violations).toHaveLength(0);
      expect(result.headline).toContain("did not find a problem");
      expect(result.disclaimer).toBeTruthy();
    }
  });

  // ── Pipeline Test 3: Lease override → 0 violations ──────────────
  it("written lease with 2-day period → 0 violations (lease controls)", () => {
    const result = pipelineRun("lease_override");
    expect(result.kind).toBe("evaluated");
    if (result.kind === "evaluated") {
      expect(result.violations).toHaveLength(0);
      // The lease period matches the stated period — this is correct
      expect(result.headline).toContain("did not find a problem");
    }
  });

  // ── Pipeline Test 4: Unreadable period → unknown, no accusation ─
  it("unreadable notice period → unknown findings, no false accusation", () => {
    const result = pipelineRun("unreadable");
    expect(result.kind).toBe("evaluated");
    if (result.kind === "evaluated") {
      // CRITICAL: an unreadable field must produce NO violation
      expect(result.violations).toHaveLength(0);
      expect(result.unknowns.length).toBeGreaterThanOrEqual(1);
      expect(result.needs_human_review).toBe(true);
      expect(result.headline).toContain("could not check");
    }
  });

  // ── Pipeline Test 5: Out-of-state → refuses to evaluate ─────────
  it("Florida notice → out_of_jurisdiction, engine refuses to guess", () => {
    const result = pipelineRun("out_of_state");
    expect(result.kind).toBe("out_of_jurisdiction");
    if (result.kind === "out_of_jurisdiction") {
      expect(result.facts_state).toBe("other");
      expect(result.message).toBeTruthy();
    }
    // Every result carries a disclaimer
    expect(result.disclaimer).toBeTruthy();
  });

  // ── Pipeline Test 6: Door-posted + also mailed → passes ─────────
  it("door-posted notice that was also mailed → 0 violations", () => {
    const result = pipelineRun("posted_and_mailed");
    expect(result.kind).toBe("evaluated");
    if (result.kind === "evaluated") {
      expect(result.violations).toHaveLength(0);
      expect(result.headline).toContain("did not find a problem");
    }
  });

  // ── Pipeline Test 7: Unknown notice type → refuses ──────────────
  it("unrecognizable document → unknown_notice_type, refuses to evaluate", () => {
    const result = pipelineRun("unknown_type");
    expect(result.kind).toBe("unknown_notice_type");
    if (result.kind === "unknown_notice_type") {
      expect(result.message).toBeTruthy();
    }
    expect(result.disclaimer).toBeTruthy();
  });

  // ── Pipeline Test 8: Every result carries a disclaimer ──────────
  it("every fixture produces a disclaimer, regardless of outcome", () => {
    for (const fixtureName of Object.keys(ALL_MOCKS)) {
      const result = pipelineRun(fixtureName as keyof typeof ALL_MOCKS);
      expect(
        result.disclaimer,
        `disclaimer missing on fixture "${fixtureName}"`,
      ).toBeTruthy();
      expect(result.disclaimer.length).toBeGreaterThan(20);
    }
  });

  // ── Pipeline Test 9: mockExtractNotice returns deep copies ──────
  it("mockExtractNotice returns independent copies (no shared mutation)", () => {
    const copy1 = mockExtractNotice("defective");
    const copy2 = mockExtractNotice("defective");
    // Mutate copy1
    copy1.notice_type = "unknown";
    copy1.clauses = [];
    // copy2 must be unaffected
    expect(copy2.notice_type).toBe("nonpayment_eviction");
    expect(copy2.clauses.length).toBeGreaterThan(0);
  });

  // ── Pipeline Test 10: Schema integrity ──────────────────────────
  it("every mock fixture has non-empty clauses (the Why Panel needs them)", () => {
    for (const [name, facts] of Object.entries(ALL_MOCKS)) {
      // 'unknown_type' is allowed to have 0 clauses
      if (name === "unknown_type") continue;
      expect(
        facts.clauses.length,
        `fixture "${name}" has no clauses — the Why Panel will be empty`,
      ).toBeGreaterThan(0);
      for (const clause of facts.clauses) {
        expect(clause.label).toBeTruthy();
        expect(clause.text).toBeTruthy();
      }
    }
  });
});
