import { NextResponse } from "next/server";
import { DISCLAIMER, evaluateNotice } from "@/lib/engine/evaluate";
import { extractNotice } from "@/lib/extraction/gemini";
import { ALL_MOCKS, mockExtractNotice } from "@/lib/extraction/mock";
import { computeDeadline } from "@/lib/deadline/compute";
import type { ExtractedFacts, Ruleset } from "@/lib/engine/types";
import type { AnalyzeError, AnalyzeSuccess } from "@/lib/api/types";
import rulesetJson from "@/lib/rules/tx-24-005.rules.json";

export const runtime = "nodejs";

const RULESET = rulesetJson as unknown as Ruleset;

function errorResponse(message: string, status = 400) {
  const body: AnalyzeError = { ok: false, error: message, disclaimer: DISCLAIMER };
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("We could not read that request.");
  }

  try {
    let facts: ExtractedFacts;

    if (body.mode === "demo") {
      if (typeof body.fixture !== "string" || !(body.fixture in ALL_MOCKS)) {
        return errorResponse(`Unknown sample notice: ${String(body.fixture)}`);
      }
      facts = mockExtractNotice(body.fixture as keyof typeof ALL_MOCKS);
    } else if (body.mode === "live") {
      if (typeof body.imageBase64 !== "string" || body.imageBase64.length < 100) {
        return errorResponse("No photo was received. Please try again.");
      }
      facts = await extractNotice(body.imageBase64);
    } else {
      return errorResponse("Unknown request mode.");
    }

    const evaluation = evaluateNotice(facts, RULESET);

    let deadline = null;
    if (
      evaluation.kind === "evaluated" &&
      facts.notice_type === "nonpayment_eviction" &&
      typeof facts.date_issued === "string" &&
      typeof facts.notice_period_days_stated === "number"
    ) {
      const now = new Date().toISOString();
      deadline = computeDeadline({
        dateIssued: facts.date_issued,
        noticePeriodDays: facts.notice_period_days_stated,
        tenantName: facts.tenant_name,
        landlordName: facts.landlord_name,
        todayIso: now.slice(0, 10),
        generatedAtIso: now,
      });
    }

    const response: AnalyzeSuccess = {
      ok: true,
      facts,
      evaluation,
      deadline,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return errorResponse(`We could not finish the check: ${message}`, 500);
  }
}