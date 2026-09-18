import type { ExtractedFacts, EvaluationResult } from "@/lib/engine/types";
import type { DeadlineResult } from "@/lib/deadline/compute";

export type AnalyzeRequestBody =
  | { mode: "demo"; fixture: string }
  | { mode: "live"; imageBase64: string };

export interface AnalyzeSuccess {
  ok: true;
  facts: ExtractedFacts;
  evaluation: EvaluationResult;
  deadline: DeadlineResult | null;
  generatedAt: string;
}

export interface AnalyzeError {
  ok: false;
  error: string;
  disclaimer: string;
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeError;
