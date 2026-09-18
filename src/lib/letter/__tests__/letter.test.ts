import { describe, it, expect } from "vitest";
import {
  generateDisputeLetter,
  generateNegotiationLetter,
} from "../template";
import { generateLetter } from "../generate";
import {
  MOCK_DEFECTIVE_NOTICE,
  MOCK_CLEAN_NOTICE,
} from "@/lib/extraction/mock";
import ruleset from "@/lib/rules/tx-24-005.rules.json";
import type { Finding } from "@/lib/engine/types";

// Helper: build findings from a mock evaluation
function makeFindingsFromMock(name: string): Finding[] {
  if (name === "defective") {
    return [
      {
        rule_id: "TX-24.005-1",
        title: "Not enough days given",
        plain_language: "The paper gives fewer than 3 days.",
        severity: "fatal" as const,
        statute: ruleset.statute as unknown as Finding["statute"],
        status: "violation",
        notice_evidence: "You are hereby given 2 days to vacate the premises.",
        explanation: "The notice gives only 2 days.",
      },
      {
        rule_id: "TX-24.005-2",
        title: "Not delivered in person or by mail",
        plain_language: "The paper was taped to the door and not mailed.",
        severity: "fatal" as const,
        statute: ruleset.statute as unknown as Finding["statute"],
        status: "violation",
        notice_evidence:
          "This notice was posted on the door of the above-referenced unit.",
        explanation: "Delivery by taped notice without mailing is insufficient.",
      },
    ];
  }
  return [];
}

describe("Response Letter — deterministic template", () => {
  it("defective fixture produces a dispute letter with 2 citations", () => {
    const findings = makeFindingsFromMock("defective");
    const letter = generateDisputeLetter({
      facts: MOCK_DEFECTIVE_NOTICE,
      findings,
      deadline: null,
    });

    expect(letter).toContain("Defective Notice to Vacate");
    expect(letter).toContain("WHAT THIS MEANS IN SIMPLE WORDS");
    expect(letter).toContain("IMPORTANT DISCLAIMER");
    expect(letter).toContain("No lawyer wrote it");
    expect(letter).toContain("2 days to vacate"); // notice evidence
    expect(letter).toContain(
      "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.24.htm",
    );
  });

  it("clean fixture produces negotiation letter, no false accusations", () => {
    const letter = generateNegotiationLetter({
      facts: MOCK_CLEAN_NOTICE,
      deadline: null,
    });
    expect(letter).toContain("Good-Faith Discussion");
    expect(letter).not.toContain("Defective Notice to Vacate");
    expect(letter).toContain("did not find the same checklist problems");
    expect(letter).toContain("This is legal information, not legal advice");
  });

  it("letter contains 5th-grade explanation and non-attorney disclaimer", () => {
    const letter = generateDisputeLetter({
      facts: MOCK_DEFECTIVE_NOTICE,
      findings: makeFindingsFromMock("defective"),
      deadline: null,
    });
    expect(letter).toContain("WHAT THIS MEANS IN SIMPLE WORDS");
    expect(letter).toContain("automated assistance");
    expect(letter).toContain("Only a licensed Texas attorney");
  });
});

describe("Response Letter — LLM generator with fallback", () => {
  it("returns deterministic text when GEMINI_API_KEY is missing", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const result = await generateLetter(
      {
        facts: MOCK_DEFECTIVE_NOTICE,
        findings: makeFindingsFromMock("defective"),
        deadline: null,
      },
      true,
    );

    expect(result.source).toBe("template");
    expect(result.citationCount).toBe(2);
    expect(result.text).toContain("Defective Notice");

    process.env.GEMINI_API_KEY = originalKey;
  });

  it("returns template for clean notice (no false violations invented)", async () => {
    const result = await generateLetter(
      { facts: MOCK_CLEAN_NOTICE, findings: [], deadline: null },
      true,
    );
    expect(result.citationCount).toBe(0);
    expect(result.text).toContain("Good-Faith Discussion");
    expect(result.text).not.toContain("Defective Notice to Vacate");
  });
});