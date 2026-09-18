/**
 * Deadline Shield — pure deadline math for Texas notices to vacate.
 *
 * Texas time-computation rule (Tex. R. Civ. P. 4; Tex. Gov't Code § 311.014):
 * the day the event happens (delivery of the notice) is NOT counted.
 * Day 1 is the day AFTER delivery.
 *
 * Example: a 3-day notice given Jan 15.
 *   Day 1 = Jan 16, Day 2 = Jan 17, Day 3 = Jan 18.
 *   The notice period ends at the end of Jan 18.
 *   The landlord's earliest possible filing date is Jan 19.
 *
 * We do NOT auto-move a deadline off a weekend or holiday. Court-filing rules
 * sometimes do that; notice rules may not. We flag it and tell the user to
 * ask a lawyer. Guessing here would be legal overreach.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Common federal holidays for 2026 (dates a court might be closed).
 * Hand-verified, intentionally static. This list is NOT exhaustive and is
 * used only to raise a caution flag — never to change a computed date.
 */
const HOLIDAYS_2026: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents' Day",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)",
  "2026-07-04": "Independence Day",
  "2026-09-07": "Labor Day",
  "2026-10-12": "Columbus Day",
  "2026-11-11": "Veterans Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
};

export interface ComputeDeadlineInput {
  dateIssued: string;      // YYYY-MM-DD
  noticePeriodDays: number;
  tenantName: string | null;
  landlordName: string | null;
  todayIso: string;        // YYYY-MM-DD, passed in — keeps this function pure
  generatedAtIso: string;  // full ISO timestamp, used for the .ics DTSTAMP
}

export interface DeadlineResult {
  dateIssued: string;
  noticePeriodDays: number;
  responseDeadline: string;     // last day of the notice period
  earliestFilingDate: string;   // day after — earliest the landlord can file
  daysRemaining: number;
  deadlineFallsOnWeekend: boolean;
  deadlineFallsOnHoliday: boolean;
  holidayName: string | null;
  caution: string | null;
  icsEvent: string;             // raw .ics file content, ready to download
}

function parseIsoDateUtc(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00Z`); // noon UTC avoids DST edge cases
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function formatIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545 line folding — keeps Outlook from choking on long lines
function foldLine(line: string): string {
  if (line.length <= 73) return line;
  const chunks: string[] = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return chunks.join("\r\n");
}

function dtStamp(generatedAtIso: string): string {
  const d = new Date(generatedAtIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function toIcsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function buildIcsEvent(p: {
  uid: string;
  deadlineIso: string;
  exclusiveEndIso: string; // deadline + 1 day; DTEND is exclusive per RFC 5545
  generatedAtIso: string;
  noticePeriodDays: number;
  tenantName: string | null;
  landlordName: string | null;
}): string {
  const who = p.tenantName ? ` for ${p.tenantName}` : "";
  const from = p.landlordName ? ` Landlord: ${p.landlordName}.` : "";
  const description =
    `The ${p.noticePeriodDays}-day notice period${who} ends today.${from} ` +
    `The landlord may be able to file a court case tomorrow. ` +
    `This is legal information, not legal advice. Talk to a lawyer or legal aid.`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CounterNotice//Deadline Shield//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${p.uid}`,
    `DTSTAMP:${dtStamp(p.generatedAtIso)}`,
    `DTSTART;VALUE=DATE:${toIcsDate(p.deadlineIso)}`,
    `DTEND;VALUE=DATE:${toIcsDate(p.exclusiveEndIso)}`,
    `SUMMARY:${icsEscape("Notice period ends - CounterNotice")}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape("CounterNotice: your notice period ends tomorrow")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Pure function. Same inputs, same outputs. Returns null instead of guessing
 * when the inputs are unreadable or invalid.
 */
export function computeDeadline(input: ComputeDeadlineInput): DeadlineResult | null {
  const issued = parseIsoDateUtc(input.dateIssued);
  const today = parseIsoDateUtc(input.todayIso);
  if (!issued || !today) return null;
  if (!Number.isInteger(input.noticePeriodDays) || input.noticePeriodDays < 1) return null;

  const deadlineDate = addDays(issued, input.noticePeriodDays);
  const filingDate = addDays(deadlineDate, 1);

  const deadlineIso = formatIso(deadlineDate);
  const filingIso = formatIso(filingDate);

  const daysRemaining = Math.round(
    (deadlineDate.getTime() - today.getTime()) / DAY_MS,
  );

  const onWeekend = isWeekend(deadlineDate);
  const holiday = HOLIDAYS_2026[deadlineIso] ?? null;

  let caution: string | null = null;
  if (daysRemaining < 0) {
    caution =
      "This day has already passed. If you just got this paper, look at the date it was given to you. Talk to a lawyer or call legal aid right away.";
  } else if (holiday) {
    caution = `The last day falls on ${holiday}, a holiday. Court days often move to the next work day. That may not happen with a notice to vacate. Ask a lawyer.`;
  } else if (onWeekend) {
    caution =
      "The last day falls on a weekend. Court days often move to the next work day. That may not happen with a notice to vacate. Ask a lawyer.";
  }

  const uid =
    `counternotice-` +
    hashString(
      `${input.dateIssued}|${input.noticePeriodDays}|${input.tenantName ?? "unknown"}|${input.landlordName ?? "unknown"}`,
    ) +
    `@counternotice.app`;

  const icsEvent = buildIcsEvent({
    uid,
    deadlineIso,
    exclusiveEndIso: filingIso, // deadline + 1 day, exclusive per RFC 5545
    generatedAtIso: input.generatedAtIso,
    noticePeriodDays: input.noticePeriodDays,
    tenantName: input.tenantName,
    landlordName: input.landlordName,
  });

  return {
    dateIssued: input.dateIssued,
    noticePeriodDays: input.noticePeriodDays,
    responseDeadline: deadlineIso,
    earliestFilingDate: filingIso,
    daysRemaining,
    deadlineFallsOnWeekend: onWeekend,
    deadlineFallsOnHoliday: holiday !== null,
    holidayName: holiday,
    caution,
    icsEvent,
  };
}