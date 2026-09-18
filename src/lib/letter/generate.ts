import { GoogleGenAI } from "@google/genai";
import { generateDisputeLetter, generateNegotiationLetter } from "./template";
import type { LetterInput } from "./template";

/**
 * Polishes ONLY formatting. Never changes citations, claims, or structure.
 * Falls back to the raw deterministic letter on any error or empty response.
 */
export async function polishLetter(
  raw: string,
  context: { type: "dispute" | "negotiation"; citationCount: number },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return raw;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `You are a strict formatting assistant. The user will give you a formal letter that contains legal citations and a "WHAT THIS MEANS IN SIMPLE WORDS" section. ` +
                `Your rules:\n` +
                `1. Do NOT change any legal claim.\n` +
                `2. Do NOT add or remove any statutory citation or URL.\n` +
                `3. Do NOT change the "WHAT THIS MEANS IN SIMPLE WORDS" paragraph meaning.\n` +
                `4. Do NOT change the disclaimer.\n` +
                `5. ONLY fix: extra blank lines, inconsistent spacing, broken paragraphs, punctuation errors.\n` +
                `6. If the letter looks correct, return it EXACTLY unchanged.\n` +
                `7. If anything looks unsafe to change, return exactly what you received.\n` +
                `Context: this is a ${context.type} letter with ${context.citationCount} statutory citations.`,
            },
            { text: raw },
          ],
        },
      ],
      config: { temperature: 0, responseMimeType: "text/plain" },
    });

    const polished = (response.text ?? "").trim();
    // Safety gate: if LLM returns something far shorter or empty, reject it
    if (polished.length < raw.trim().length * 0.7) return raw;
    return polished;
  } catch {
    // Any failure — API down, rate limit, network error — immediate deterministic fallback
    return raw;
  }
}

export interface GenerateLetterResult {
  text: string;
  source: "template" | "llm_polished";
  citationCount: number;
}

/**
 * Main entry point. Always returns a complete letter.
 * The LLM is decorative; the template is authoritative.
 */
export async function generateLetter(
  input: LetterInput,
  useLLM = true,
): Promise<GenerateLetterResult> {
  const violations = input.findings.length;
  const raw =
    violations > 0
      ? generateDisputeLetter(input)
      : generateNegotiationLetter({
          facts: input.facts,
          deadline: input.deadline,
          generatedAtIso: input.generatedAtIso,
        });

  if (!useLLM) {
    return { text: raw, source: "template", citationCount: violations };
  }

  const polished = await polishLetter(raw, {
    type: violations > 0 ? "dispute" : "negotiation",
    citationCount: violations,
  });

  return {
    text: polished,
    source: polished === raw ? "template" : "llm_polished",
    citationCount: violations,
  };
}