export type NoticeType = 'nonpayment_eviction' | 'rent_increase' | 'entry_or_repair' | 'unknown';
export type DeliveryMethod = 'hand_delivered' | 'mail' | 'taped_to_door' | 'unknown';
export type RuleStatus = 'violation' | 'pass' | 'unknown';
export type Severity = 'fatal' | 'serious' | 'minor';

export interface NoticeClause { label: string; text: string; }  // raw words from the photo, for the Why Panel

export interface ExtractedFacts {
  notice_type: NoticeType;
  state: 'TX' | 'other' | 'unknown';
  landlord_name: string | null;
  tenant_name: string | null;
  date_issued: string | null;
  amount_demanded: number | null;
  notice_period_days_stated: number | null;
  delivery_method: DeliveryMethod;
  also_mailed: boolean | null;
  written_lease: boolean | null;
  lease_notice_period_days: number | null;
  required_elements_present: string[];
  clauses: NoticeClause[];
}

export interface StatuteRef { cite: string; subsection: string; quote: string; url: string; }

export interface Rule {
  id: string;
  check_id: string;
  title: string;
  plain_language: string;
  severity: Severity;
  basis: 'statute' | 'case_law_pending';
  statute: StatuteRef;
  exceptions?: { when: string; effect: string; statute_quote: string }[];
}

export interface Ruleset {
  ruleset_id: string; version: string; verified_on: string | null;
  state: string; notice_type: string; statute: StatuteRef;
  glossary: { term: string; plain_language: string }[];
  rules: Rule[];
}

export interface RuleOutcome { status: RuleStatus; notice_evidence: string | null; explanation: string; }
export interface Finding extends RuleOutcome {
  rule_id: string; title: string; plain_language: string; severity: Severity; statute: StatuteRef;
}

export type EvaluationResult =
  | { kind: 'evaluated'; ruleset_id: string; findings: Finding[]; violations: Finding[];
      unknowns: Finding[]; passes: Finding[]; headline: string;
      needs_human_review: boolean; disclaimer: string }
  | { kind: 'out_of_jurisdiction'; facts_state: string; message: string; disclaimer: string }
  | { kind: 'unknown_notice_type'; message: string; disclaimer: string };
