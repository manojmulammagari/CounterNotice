import type { ExtractedFacts } from "@/lib/engine/types";

// ────────────────────────────────────────────────────────────────────
// Mock extraction fixtures
//
// These mirror the EXACT data used in the Step 1 engine tests.
// If the engine tests pass with hand-typed facts, these pipeline tests
// MUST also pass — the data is identical.
// ────────────────────────────────────────────────────────────────────

/**
 * A defective notice: 2-day period, taped to door (not mailed), no written lease.
 * Expected engine result: 2 fatal violations (period < 3, not in-person/mail).
 *
 * IMPORTANT: also_mailed must be `false` (not null) so the delivery check
 * produces a violation rather than an unknown. Mirrors the engine test fixture.
 */
export const MOCK_DEFECTIVE_NOTICE: ExtractedFacts = {
  notice_type: "nonpayment_eviction",
  state: "TX",
  landlord_name: "Acme Property Management LLC",
  tenant_name: "Maria Santos",
  date_issued: "2026-01-15",
  amount_demanded: 1200,
  notice_period_days_stated: 2,
  delivery_method: "taped_to_door",
  also_mailed: false,
  written_lease: false,
  lease_notice_period_days: null,
  required_elements_present: ["demand_for_possession", "rent_only"],
  clauses: [
    {
      label: "notice_period",
      text: "You are hereby given 2 days to vacate the premises.",
    },
    { label: "amount_demanded", text: "Total amount due: $1,200.00" },
    {
      label: "demand_for_possession",
      text: "You are required to surrender possession of the unit.",
    },
    {
      label: "delivery_method",
      text: "This notice was posted on the door of the above-referenced unit.",
    },
    {
      label: "landlord_info",
      text: "Acme Property Management LLC, 456 Oak St, Dallas, TX 75201",
    },
    {
      label: "tenant_info",
      text: "Maria Santos, Unit 12B, 456 Oak St, Dallas, TX 75201",
    },
  ],
};

/**
 * A clean notice: 3-day period, hand delivered, no lease issues.
 * Expected engine result: 0 violations.
 */
export const MOCK_CLEAN_NOTICE: ExtractedFacts = {
  notice_type: "nonpayment_eviction",
  state: "TX",
  landlord_name: "Greystone Apartments LP",
  tenant_name: "James Wilson",
  date_issued: "2026-01-20",
  amount_demanded: 950,
  notice_period_days_stated: 3,
  delivery_method: "hand_delivered",
  also_mailed: null,
  written_lease: false,
  lease_notice_period_days: null,
  required_elements_present: ["demand_for_possession", "rent_only"],
  clauses: [
    {
      label: "notice_period",
      text: "You are hereby given 3 days to vacate the premises.",
    },
    { label: "amount_demanded", text: "Amount due: $950.00" },
    {
      label: "demand_for_possession",
      text: "You are required to immediately surrender possession.",
    },
    { label: "delivery_method", text: "Hand delivered to tenant." },
    { label: "landlord_info", text: "Greystone Apartments LP" },
    { label: "tenant_info", text: "James Wilson, Apt 7A" },
  ],
};

/**
 * A notice where the written lease sets a 2-day period.
 * Expected engine result: 0 violations (lease controls, not the statute default).
 */
export const MOCK_LEASE_OVERRIDE: ExtractedFacts = {
  notice_type: "nonpayment_eviction",
  state: "TX",
  landlord_name: "Westside Holdings Inc",
  tenant_name: "Chen Wei",
  date_issued: "2026-02-01",
  amount_demanded: 1800,
  notice_period_days_stated: 2,
  delivery_method: "hand_delivered",
  also_mailed: null,
  written_lease: true,
  lease_notice_period_days: 2,
  required_elements_present: ["demand_for_possession", "rent_only"],
  clauses: [
    {
      label: "notice_period",
      text: "Per your lease agreement, you are given 2 days to vacate.",
    },
    { label: "amount_demanded", text: "Amount due: $1,800.00" },
    {
      label: "demand_for_possession",
      text: "Surrender possession immediately.",
    },
    { label: "delivery_method", text: "Hand delivered." },
    { label: "landlord_info", text: "Westside Holdings Inc" },
    { label: "tenant_info", text: "Chen Wei, Unit 3C" },
  ],
};

/**
 * A notice where the notice period was unreadable (bad photo).
 * Expected engine result: 0 violations, 1+ unknowns, needs_human_review.
 *
 * delivery_method is 'taped_to_door' with also_mailed: null → delivery is unknown.
 * notice_period_days_stated: null → period check is unknown.
 * Both produce unknowns, zero violations — no false accusation.
 */
export const MOCK_UNREADABLE_PERIOD: ExtractedFacts = {
  notice_type: "nonpayment_eviction",
  state: "TX",
  landlord_name: "Sunbelt Realty Group",
  tenant_name: null,
  date_issued: null,
  amount_demanded: null,
  notice_period_days_stated: null,
  delivery_method: "taped_to_door",
  also_mailed: null,
  written_lease: null,
  lease_notice_period_days: null,
  required_elements_present: [],
  clauses: [
    {
      label: "unclear_text",
      text: "[Illegible — could not extract notice period]",
    },
  ],
};

/**
 * A notice from Florida, not Texas.
 * Expected engine result: kind 'out_of_jurisdiction'.
 */
export const MOCK_OUT_OF_STATE: ExtractedFacts = {
  notice_type: "nonpayment_eviction",
  state: "other",
  landlord_name: "Florida Keys Rentals LLC",
  tenant_name: "Alex Johnson",
  date_issued: "2026-01-10",
  amount_demanded: 2000,
  notice_period_days_stated: 3,
  delivery_method: "mail",
  also_mailed: true,
  written_lease: null,
  lease_notice_period_days: null,
  required_elements_present: ["demand_for_possession"],
  clauses: [
    { label: "notice_period", text: "3 days to vacate." },
    {
      label: "state_indicator",
      text: "State of Florida, Miami-Dade County",
    },
  ],
};

/**
 * A door-posted notice that was also mailed (legal delivery combo).
 * Expected engine result: 0 violations.
 */
export const MOCK_POSTED_AND_MAILED: ExtractedFacts = {
  notice_type: "nonpayment_eviction",
  state: "TX",
  landlord_name: "Metro Living LLC",
  tenant_name: "Patricia Davis",
  date_issued: "2026-01-25",
  amount_demanded: 1100,
  notice_period_days_stated: 3,
  delivery_method: "taped_to_door",
  also_mailed: true,
  written_lease: false,
  lease_notice_period_days: null,
  required_elements_present: ["demand_for_possession"],
  clauses: [
    { label: "notice_period", text: "You have 3 days to vacate." },
    {
      label: "delivery_method",
      text: "Posted on door and sent via certified mail.",
    },
    { label: "amount_demanded", text: "$1,100.00 due." },
    {
      label: "demand_for_possession",
      text: "Surrender possession of the premises.",
    },
  ],
};

/**
 * A completely unrecognizable document.
 * Expected engine result: kind 'unknown_notice_type'.
 */
export const MOCK_UNKNOWN_TYPE: ExtractedFacts = {
  notice_type: "unknown",
  state: "TX",
  landlord_name: null,
  tenant_name: null,
  date_issued: null,
  amount_demanded: null,
  notice_period_days_stated: null,
  delivery_method: "unknown",
  also_mailed: null,
  written_lease: null,
  lease_notice_period_days: null,
  required_elements_present: [],
  clauses: [],
};

// ── Registry ────────────────────────────────────────────────────────

export const ALL_MOCKS: Record<string, ExtractedFacts> = {
  defective: MOCK_DEFECTIVE_NOTICE,
  clean: MOCK_CLEAN_NOTICE,
  lease_override: MOCK_LEASE_OVERRIDE,
  unreadable: MOCK_UNREADABLE_PERIOD,
  out_of_state: MOCK_OUT_OF_STATE,
  posted_and_mailed: MOCK_POSTED_AND_MAILED,
  unknown_type: MOCK_UNKNOWN_TYPE,
};

/**
 * Returns a deep copy of a mock fixture so tests cannot mutate shared state.
 * The API route will also use this when GEMINI_API_KEY is missing (demo mode).
 */
export function mockExtractNotice(fixtureName: keyof typeof ALL_MOCKS): ExtractedFacts {
  const fixture = ALL_MOCKS[fixtureName];
  if (!fixture) {
    throw new Error(
      `Unknown mock fixture: "${String(fixtureName)}". Available: ${Object.keys(ALL_MOCKS).join(", ")}`,
    );
  }
  return structuredClone(fixture);
}
