import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedFacts } from "@/lib/engine/types";

// ── Gemini response schema ──────────────────────────────────────────
// Every field, every type, every enum MUST match ExtractedFacts exactly.
// Gemini enforces this at the API level — the model physically cannot
// return a shape that violates this schema.

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    notice_type: {
      type: Type.STRING,
      enum: ["nonpayment_eviction", "rent_increase", "entry_or_repair", "unknown"],
      description:
        "The type of legal notice in the image. Use 'unknown' if you cannot determine it.",
    },
    state: {
      type: Type.STRING,
      enum: ["TX", "other", "unknown"],
      description:
        "The US state the notice is from. Use 'TX' only if the notice clearly references Texas. Otherwise 'other' or 'unknown'.",
    },
    landlord_name: {
      type: Type.STRING,
      nullable: true,
      description: "The landlord's full legal name, exactly as printed. null if not visible.",
    },
    tenant_name: {
      type: Type.STRING,
      nullable: true,
      description: "The tenant's full name, exactly as printed. null if not visible.",
    },
    date_issued: {
      type: Type.STRING,
      nullable: true,
      description:
        "The date the notice was issued, in YYYY-MM-DD format. null if the date is not visible or unreadable.",
    },
    amount_demanded: {
      type: Type.NUMBER,
      nullable: true,
      description:
        "The total dollar amount demanded (e.g. past-due rent). null if no amount is stated.",
    },
    notice_period_days_stated: {
      type: Type.INTEGER,
      nullable: true,
      description:
        "The number of days the notice gives the tenant. For example, a '3-day notice' returns 3. null if the period is not stated or unreadable.",
    },
    delivery_method: {
      type: Type.STRING,
      enum: ["hand_delivered", "mail", "taped_to_door", "unknown"],
      description:
        "How the notice was delivered to the tenant, as stated or implied in the notice.",
    },
    also_mailed: {
      type: Type.BOOLEAN,
      nullable: true,
      description:
        "Whether the notice was also sent by mail (relevant when posted on a door). null if not mentioned.",
    },
    written_lease: {
      type: Type.BOOLEAN,
      nullable: true,
      description:
        "Whether the notice references a written lease agreement. null if not mentioned.",
    },
    lease_notice_period_days: {
      type: Type.INTEGER,
      nullable: true,
      description:
        "If a written lease is referenced, the notice period (in days) set by that lease. null if not applicable or not stated.",
    },
    required_elements_present: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Legal elements found in the notice. Possible values: "demand_for_possession" (the notice tells the tenant to leave), "rent_only" (the demand is only for rent, not other charges). Add others if clearly present.',
    },
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description:
              'A short label: "notice_period", "amount_demanded", "demand_for_possession", "delivery_method", "landlord_info", "tenant_info", or another descriptive label.',
          },
          text: {
            type: Type.STRING,
            description:
              "The VERBATIM text from the notice. Quote it exactly — do not summarize or paraphrase.",
          },
        },
        required: ["label", "text"],
      },
      description:
        "Key text passages extracted verbatim from the notice. These are displayed to the user in a side-by-side comparison with the statute.",
    },
  },
  required: [
    "notice_type",
    "state",
    "landlord_name",
    "tenant_name",
    "date_issued",
    "amount_demanded",
    "notice_period_days_stated",
    "delivery_method",
    "also_mailed",
    "written_lease",
    "lease_notice_period_days",
    "required_elements_present",
    "clauses",
  ],
} as const;

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a fact-extraction system. You look at an image of an eviction notice from Texas and extract facts into structured JSON.

RULES:
1. Extract ONLY what you can read. If a field is not visible or unclear, set it to null.
2. NEVER judge whether the notice is legal or illegal. That is not your job.
3. NEVER give legal advice. You only report what is written on the paper.
4. Quote text VERBATIM in the "clauses" array. Do not summarize.
5. If the notice appears to be from a state other than Texas, set state to "other".
6. If you cannot identify the notice type, set notice_type to "unknown".

For the "clauses" array, extract these sections if visible:
- "notice_period" — the part that says how many days the tenant has
- "amount_demanded" — the part that states the amount owed
- "demand_for_possession" — the part that tells the tenant to leave
- "delivery_method" — how the notice was delivered (in person, mail, posted on door)
- "landlord_info" — landlord name, address, or contact information
- "tenant_info" — tenant name and/or unit address`;

// ── Extraction function ─────────────────────────────────────────────

/**
 * Sends an image of an eviction notice to Gemini Flash and returns
 * strictly typed facts. The model physically cannot violate the schema.
 *
 * @param imageBase64  Raw base64 string of the notice photo (no data: prefix)
 * @returns            Typed ExtractedFacts matching the engine contract
 * @throws             If GEMINI_API_KEY is missing, the image is blocked,
 *                     or the response is unparseable
 */
export async function extractNotice(imageBase64: string): Promise<ExtractedFacts> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local, or use mock extraction for testing.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error(
      "Gemini returned an empty response. The image may have been blocked by safety filters or was unreadable.",
    );
  }

  let parsed: ExtractedFacts;
  try {
    parsed = JSON.parse(text) as ExtractedFacts;
  } catch {
    throw new Error(
      `Gemini returned invalid JSON. First 200 chars: ${text.slice(0, 200)}`,
    );
  }

  // Defensive defaults — arrays must never be null for the engine
  parsed.clauses = parsed.clauses ?? [];
  parsed.required_elements_present = parsed.required_elements_present ?? [];

  return parsed;
}
