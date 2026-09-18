import { describe, it, expect } from "vitest";
import { computeDeadline } from "@/lib/deadline/compute";
import type { ComputeDeadlineInput } from "@/lib/deadline/compute";

// ── Base input: 3-day notice given Jan 15, checked on the same day ─────────
const BASE: ComputeDeadlineInput = {
  dateIssued: "2026-01-15",
  noticePeriodDays: 3,
  tenantName: "Maria Santos",
  landlordName: "Acme Property Management LLC",
  todayIso: "2026-01-15",
  generatedAtIso: "2026-01-15T12:00:00Z",
};

describe("Deadline Shield — computeDeadline", () => {
  // ── Test 1: Day-counting rule ────────────────────────────────────────────
  it("does not count the day the notice was given (3-day notice)", () => {
    const result = computeDeadline(BASE);
    expect(result).not.toBeNull();
    if (!result) return;
    // Day 1 = Jan 16, Day 2 = Jan 17, Day 3 = Jan 18
    expect(result.responseDeadline).toBe("2026-01-18");
    // Earliest filing = day after deadline
    expect(result.earliestFilingDate).toBe("2026-01-19");
    // today = Jan 15, deadline = Jan 18 → 3 days remaining
    expect(result.daysRemaining).toBe(3);
  });

  // ── Test 2: 2-day notice ────────────────────────────────────────────────
  it("works for a 2-day notice", () => {
    const result = computeDeadline({ ...BASE, noticePeriodDays: 2 });
    expect(result).not.toBeNull();
    if (!result) return;
    // Day 1 = Jan 16, Day 2 = Jan 17
    expect(result.responseDeadline).toBe("2026-01-17");
    expect(result.earliestFilingDate).toBe("2026-01-18");
  });

  // ── Test 3: Weekend flag ─────────────────────────────────────────────────
  it("flags a deadline that lands on a weekend", () => {
    // Jan 1, 2026 + 2 days = Jan 3 (Saturday)
    const result = computeDeadline({
      ...BASE,
      dateIssued: "2026-01-01",
      noticePeriodDays: 2,
      todayIso: "2026-01-01",
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.responseDeadline).toBe("2026-01-03");
    expect(result.deadlineFallsOnWeekend).toBe(true);
    expect(result.caution).toBeTruthy();
    expect(result.caution).toContain("weekend");
  });

  // ── Test 4: Holiday flag ─────────────────────────────────────────────────
  it("flags a deadline that lands on a holiday", () => {
    // Jun 16 + 3 days = Jun 19 (Juneteenth, Friday)
    const result = computeDeadline({
      ...BASE,
      dateIssued: "2026-06-16",
      noticePeriodDays: 3,
      todayIso: "2026-06-16",
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.responseDeadline).toBe("2026-06-19");
    expect(result.deadlineFallsOnHoliday).toBe(true);
    expect(result.holidayName).toBe("Juneteenth");
    expect(result.caution).toBeTruthy();
    expect(result.caution?.toLowerCase()).toContain("holiday");
  });

  // ── Test 5: Past-deadline caution ───────────────────────────────────────
  it("shows a past-deadline caution when the date has passed", () => {
    // issued Jan 15, 3-day notice → deadline Jan 18; today Jan 20 → -2 days
    const result = computeDeadline({ ...BASE, todayIso: "2026-01-20" });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.daysRemaining).toBe(-2);
    expect(result.caution).toBeTruthy();
    expect(result.caution).toContain("already passed");
  });

  // ── Test 6: Determinism + .ics content ──────────────────────────────────
  it("is deterministic and puts exclusive DTEND (+1 day) in the .ics", () => {
    const r1 = computeDeadline(BASE);
    const r2 = computeDeadline(BASE);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    if (!r1 || !r2) return;

    // Deterministic output
    expect(r1.icsEvent).toBe(r2.icsEvent);

    // deadline Jan 18 → DTSTART:20260118
    expect(r1.icsEvent).toContain("DTSTART;VALUE=DATE:20260118");
    // exclusive DTEND = Jan 19 → 20260119
    expect(r1.icsEvent).toContain("DTEND;VALUE=DATE:20260119");
    // Wraps correctly
    expect(r1.icsEvent.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(r1.icsEvent.endsWith("\r\n")).toBe(true);
  });

  // ── Test 7: Null for bad input ───────────────────────────────────────────
  it("returns null for bad input instead of guessing", () => {
    // Non-ISO date string
    expect(
      computeDeadline({ ...BASE, dateIssued: "yesterday" }),
    ).toBeNull();

    // Zero-day notice is invalid
    expect(
      computeDeadline({ ...BASE, noticePeriodDays: 0 }),
    ).toBeNull();
  });
});