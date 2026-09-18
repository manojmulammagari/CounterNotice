import type { ExtractedFacts, RuleOutcome } from './types';

export const CHECKS: Record<string, (facts: ExtractedFacts) => RuleOutcome> = {

  notice_period_min_3_days(facts: ExtractedFacts): RuleOutcome {
    const stated = facts.notice_period_days_stated;

    // Can't read the stated period from the notice
    if (stated === null) {
      return {
        status: 'unknown',
        notice_evidence: null,
        explanation: 'We could not read how many days the notice gives. We cannot check this rule.',
      };
    }

    const clauseEvidence =
      facts.clauses.find((c) => c.label.toLowerCase().includes('notice period'))?.text ?? null;

    // No written lease (or unknown whether one exists) — plain 3-day rule applies
    if (facts.written_lease === false || facts.written_lease === null) {
      if (stated < 3) {
        return {
          status: 'violation',
          notice_evidence: clauseEvidence,
          explanation: `The notice gives only ${stated} day(s). Texas law requires at least 3 days unless a written lease says otherwise. No written lease was identified.`,
        };
      }
      return {
        status: 'pass',
        notice_evidence: clauseEvidence,
        explanation: `The notice gives ${stated} day(s), which meets the 3-day minimum.`,
      };
    }

    // written_lease === true but we don't know the lease period
    if (facts.lease_notice_period_days === null) {
      return {
        status: 'unknown',
        notice_evidence: clauseEvidence,
        explanation:
          'A written lease exists, which can set a different notice period. We could not read that period from the lease, so we cannot check this rule.',
      };
    }

    // written_lease === true and we know the lease period
    if (stated < facts.lease_notice_period_days) {
      return {
        status: 'violation',
        notice_evidence: clauseEvidence,
        explanation: `The notice gives ${stated} day(s), but your written lease requires at least ${facts.lease_notice_period_days} day(s).`,
      };
    }
    return {
      status: 'pass',
      notice_evidence: clauseEvidence,
      explanation: `The notice gives ${stated} day(s), which meets your lease's ${facts.lease_notice_period_days}-day requirement.`,
    };
  },

  delivered_in_person_or_by_mail(facts: ExtractedFacts): RuleOutcome {
    const method = facts.delivery_method;

    if (method === 'hand_delivered' || method === 'mail') {
      return {
        status: 'pass',
        notice_evidence: null,
        explanation: 'The notice was delivered in person or by mail, which satisfies the delivery requirement.',
      };
    }

    if (method === 'taped_to_door') {
      if (facts.also_mailed === true) {
        return {
          status: 'pass',
          notice_evidence: null,
          explanation:
            'The notice was posted on your door and also mailed. Under § 24.005(f-1), this can satisfy the delivery requirement.',
        };
      }
      if (facts.also_mailed === false) {
        return {
          status: 'violation',
          notice_evidence: null,
          explanation:
            'The notice was taped to your door but was not mailed. Texas law requires delivery in person or by mail (§ 24.005(f)). Taping only, without mailing, does not satisfy this requirement.',
        };
      }
      // also_mailed === null
      return {
        status: 'unknown',
        notice_evidence: null,
        explanation:
          'The notice was taped to your door. We could not tell if it was also mailed. Check your mailbox — this matters.',
      };
    }

    // method === 'unknown'
    return {
      status: 'unknown',
      notice_evidence: null,
      explanation: 'We could not determine how the notice was delivered. We cannot check this rule.',
    };
  },

  demands_possession_unconditionally(_facts: ExtractedFacts): RuleOutcome {
    return {
      status: 'unknown',
      notice_evidence: null,
      explanation:
        'This check is waiting for a person to verify it against the law. It is not part of your result yet.',
    };
  },
};
