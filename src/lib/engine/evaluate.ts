import type {
  ExtractedFacts,
  Ruleset,
  EvaluationResult,
  Finding,
  RuleOutcome,
} from './types';
import { CHECKS } from './checks';

export const DISCLAIMER =
  'CounterNotice gives legal information, not legal advice. It is not a lawyer and cannot go to court for you. Only a lawyer can tell you what will happen in your case.';

export function evaluateNotice(facts: ExtractedFacts, ruleset: Ruleset): EvaluationResult {
  // Gate 1: unknown notice type
  if (facts.notice_type === 'unknown') {
    return {
      kind: 'unknown_notice_type',
      message:
        'We could not determine what kind of notice this is. We cannot check it against our rules.',
      disclaimer: DISCLAIMER,
    };
  }

  // Gate 2: non-Texas state
  if (facts.state !== 'TX') {
    return {
      kind: 'out_of_jurisdiction',
      facts_state: facts.state,
      message:
        'We only check Texas law. We will not guess about another state. Please consult a lawyer in your state.',
      disclaimer: DISCLAIMER,
    };
  }

  // Gate 3: evaluate rules with basis === 'statute' only
  const statuteRules = ruleset.rules.filter((r) => r.basis === 'statute');
  const caseLawPendingCount = ruleset.rules.filter((r) => r.basis === 'case_law_pending').length;

  const findings: Finding[] = statuteRules.map((rule) => {
    const checkFn = CHECKS[rule.check_id];
    let outcome: RuleOutcome;

    if (checkFn) {
      outcome = checkFn(facts);
    } else {
      outcome = {
        status: 'unknown',
        notice_evidence: null,
        explanation: `No check implementation found for check_id "${rule.check_id}".`,
      };
    }

    const finding: Finding = {
      rule_id: rule.id,
      title: rule.title,
      plain_language: rule.plain_language,
      severity: rule.severity,
      statute: rule.statute,
      status: outcome.status,
      notice_evidence: outcome.notice_evidence,
      explanation: outcome.explanation,
    };
    return finding;
  });

  const violations = findings.filter((f) => f.status === 'violation');
  const unknowns = findings.filter((f) => f.status === 'unknown');
  const passes = findings.filter((f) => f.status === 'pass');

  // Gate 4: needs_human_review
  const needs_human_review = unknowns.length > 0 || caseLawPendingCount > 0;

  // Gate 6: headline — NEVER use "valid", "legal", or "illegal"
  let headline: string;
  if (violations.length > 0) {
    headline = `We found ${violations.length} possible problem(s) with this notice.`;
  } else if (unknowns.length > 0) {
    headline = 'We could not check everything on this notice.';
  } else {
    headline = 'We did not find a problem on our checklist. This does not mean the notice is valid.';
  }

  return {
    kind: 'evaluated',
    ruleset_id: ruleset.ruleset_id,
    findings,
    violations,
    unknowns,
    passes,
    headline,
    needs_human_review,
    disclaimer: DISCLAIMER,
  };
}
