import { NextResponse } from "next/server";
import { generateLetter } from "@/lib/letter/generate";
import type { ExtractedFacts, Finding } from "@/lib/engine/types";
import type { DeadlineResult } from "@/lib/deadline/compute";
import { DISCLAIMER } from "@/lib/engine/evaluate";

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message, disclaimer: DISCLAIMER },
    { status },
  );
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("We could not read the request.");
  }

  try {
    const facts = body.facts as ExtractedFacts;
    const findings = (body.findings ?? []) as Finding[];
    const deadline = (body.deadline ?? null) as DeadlineResult | null;

    if (!facts || typeof facts.notice_type !== "string") {
      return errorResponse("Missing notice facts.");
    }

    const result = await generateLetter(
      {
        facts,
        findings,
        deadline,
        generatedAtIso: new Date().toISOString(),
      },
      true,
    );

    return NextResponse.json({
      ok: true,
      text: result.text,
      source: result.source,
      citationCount: result.citationCount,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Letter generation failed.";
    return errorResponse(msg, 500);
  }
}