import { describe, it, expect } from 'vitest';
import rulesetJson from '../../rules/tx-24-005.rules.json';
import type { ExtractedFacts, Ruleset } from '../types';
import { evaluateNotice } from '../evaluate';

const ruleset = rulesetJson as unknown as Ruleset;

/** Minimal valid TX nonpayment facts — override only what each test needs */
function baseFacts(overrides: Partial<ExtractedFacts> = {}): ExtractedFacts {
  return {
    notice_type: 'nonpayment_eviction',
    state: 'TX',
    landlord_name: 'Test Landlord',
    tenant_name: 'Test Tenant',
    date_issued: '2026-09-01',
    amount_demanded: 1200,
    notice_period_days_stated: 3,
    delivery_method: 'hand_delivered',
    also_mailed: null,
    written_lease: false,
    lease_notice_period_days: null,
    required_elements_present: [],
    clauses: [],
    ...overrides,
  };
}

describe('CounterNotice — TX-24.005 nonpayment engine', () => {
  it('flags a 2-day notice taped to the door with no lease (demo path)', () => {
    const facts = baseFacts({
      notice_period_days_stated: 2,
      delivery_method: 'taped_to_door',
      also_mailed: false,
      written_lease: false,
    });
    const result = evaluateNotice(facts, ruleset);
    expect(result.kind).toBe('evaluated');
    if (result.kind !== 'evaluated') return;
    expect(result.violations).toHaveLength(2);
    expect(result.violations.every((v) => v.severity === 'fatal')).toBe(true);
    expect(result.headline).toContain('2');
  });

  it('passes a clean 3-day hand-delivered notice', () => {
    const facts = baseFacts({
      notice_period_days_stated: 3,
      delivery_method: 'hand_delivered',
      written_lease: false,
    });
    const result = evaluateNotice(facts, ruleset);
    expect(result.kind).toBe('evaluated');
    if (result.kind !== 'evaluated') return;
    expect(result.violations).toHaveLength(0);
    expect(result.headline).toContain('did not find a problem');
    expect(typeof result.disclaimer).toBe('string');
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });

  it('respects a written lease that sets its own 2-day period', () => {
    const facts = baseFacts({
      notice_period_days_stated: 2,
      delivery_method: 'hand_delivered',
      written_lease: true,
      lease_notice_period_days: 2,
    });
    const result = evaluateNotice(facts, ruleset);
    expect(result.kind).toBe('evaluated');
    if (result.kind !== 'evaluated') return;
    expect(result.violations).toHaveLength(0);
  });

  it('returns unknown instead of a violation when the period is unreadable', () => {
    const facts = baseFacts({
      notice_period_days_stated: null,
      delivery_method: 'hand_delivered',
      written_lease: false,
    });
    const result = evaluateNotice(facts, ruleset);
    expect(result.kind).toBe('evaluated');
    if (result.kind !== 'evaluated') return;
    expect(result.violations).toHaveLength(0);
    expect(result.unknowns.length).toBeGreaterThanOrEqual(1);
    expect(result.headline).toContain('could not check');
    expect(result.needs_human_review).toBe(true);
  });

  it('refuses to evaluate a non-Texas notice', () => {
    const facts = baseFacts({ state: 'other' });
    const result = evaluateNotice(facts, ruleset);
    expect(result.kind).toBe('out_of_jurisdiction');
    // findings key must be absent on this union branch
    expect((result as Record<string, unknown>).findings).toBeUndefined();
  });

  it('passes a door-posted notice that was also mailed', () => {
    const facts = baseFacts({
      notice_period_days_stated: 3,
      delivery_method: 'taped_to_door',
      also_mailed: true,
      written_lease: false,
    });
    const result = evaluateNotice(facts, ruleset);
    expect(result.kind).toBe('evaluated');
    if (result.kind !== 'evaluated') return;
    expect(result.violations).toHaveLength(0);
  });

  /**
   * Test 7 is intentionally RED until Task 3 (attorney review) is complete.
   * It enforces citation hygiene on every statute-backed rule.
   * case_law_pending rules (TX-24.005-3) are excluded from these checks.
   */
  it('ruleset hygiene: shipped rules are citation-complete', () => {
    const statuteRules = ruleset.rules.filter((r) => r.basis === 'statute');
    for (const rule of statuteRules) {
      expect(rule.plain_language.length, `${rule.id}: plain_language too short`).toBeGreaterThan(10);
      expect(rule.statute.quote.length, `${rule.id}: quote too short`).toBeGreaterThan(20);
      expect(rule.statute.subsection, `${rule.id}: subsection must start with "("`).toMatch(/^\(/);
      expect(
        rule.statute.url,
        `${rule.id}: url must be statutes.capitol.texas.gov`,
      ).toMatch(/^https:\/\/statutes\.capitol\.texas\.gov\//);
      expect(
        JSON.stringify(rule),
        `${rule.id}: contains unresolved <<VERIFY>> placeholder`,
      ).not.toContain('<<VERIFY>>');
    }
  });
});
