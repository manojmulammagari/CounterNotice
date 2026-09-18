import type { ExtractedFacts, Finding } from "@/lib/engine/types";
import type { DeadlineResult } from "@/lib/deadline/compute";

export interface LetterInput {
  facts: ExtractedFacts;
  findings: Finding[];
  deadline: DeadlineResult | null;
  generatedAtIso?: string;
}

/**
 * Builds the DISPUTE letter from deterministic facts.
 * Every citation is copied directly from rules.json via the Finding objects.
 * Never invents claims. Never paraphrases a statute quote inside a quote field.
 */
export function generateDisputeLetter(i: LetterInput): string {
  const tenant = i.facts.tenant_name || "The Tenant";
  const landlordRaw = i.facts.landlord_name || "The Landlord / Property Manager";
  const landlordFirst = landlordRaw.split(" ")[0] || "Property Manager";
  const dateStr = i.facts.date_issued ? `on ${i.facts.date_issued}` : "on the date shown";
  const url = "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.24.htm";

  // Build citation blocks — one per finding, using ONLY verified fields
  const blocks = i.findings.map((f, idx) => {
    const clause = f.notice_evidence || "See the original notice";
    const quote = f.statute.quote ? `"${f.statute.quote}"` : `See the full text at ${f.statute.url}`;
    const citeLine = f.statute.subsection
      ? `${f.statute.cite}, subsection (${f.statute.subsection})`
      : f.statute.cite;
    return `
  ${idx + 1}. ${f.title} (${f.severity} problem)
     In plain words: ${f.plain_language}
     The notice says: "${clause}"
     The Texas law says: ${quote}
     Source: ${citeLine} — ${f.statute.url}
`;
  }).join("");

  const deadlineBlock = i.deadline
    ? `Based on the date of your notice (${i.deadline.dateIssued}), the notice period runs through ${i.deadline.responseDeadline}. After that date, the earliest you could file a court case is ${i.deadline.earliestFilingDate}. I am tracking this date carefully.` +
      (i.deadline.caution ? ` Note: ${i.deadline.caution}` : "")
    : `Based on the date shown on your notice (${i.facts.date_issued || "unknown"}), I am tracking my response time carefully. I ask you to confirm the correct deadline in writing.`;

  return `
${new Date(i.generatedAtIso || new Date().toISOString()).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}

${tenant}
[Your Unit or Address]
${i.facts.state ? `${i.facts.state}` : ""}

${landlordRaw}
[Landlord or Management Office Address — from your lease or the notice]

RE: Formal Response — Defective Notice to Vacate — Texas Property Code § 24.005

Dear ${landlordFirst}:

I am writing in direct response to the notice I received ${dateStr}. I have read it carefully and compared it to the Texas state law that controls these papers. That law is called Texas Property Code § 24.005 — "Notice to Vacate." You can read the exact words of the law yourself here: ${url}

After checking each part of your notice against the law, I found the following problems:

${blocks}

Because of these problems, this notice does not meet what Texas requires before a landlord can ask a court to make a tenant leave. I am asking you to withdraw this notice in writing and, if needed, issue a new one that follows the law exactly.

My timeline: ${deadlineBlock}

This letter is written by me, the tenant. No lawyer wrote it. A computer program helped me match the words on your notice to the exact words of Texas law, and it put them on this page. This is legal information, not legal advice. I am not giving up any of my rights.

Sincerely,

${tenant}
Tenant — [Unit / Property Address]

---
WHAT THIS MEANS IN SIMPLE WORDS:
This letter tells your landlord: "Your paper has mistakes. Here are the exact Texas laws that show the mistakes. Please take back the paper and start again the right way." It also tells them the date by which you must respond. You are protecting yourself by putting everything in writing.
---
IMPORTANT DISCLAIMER — READ THIS:
This letter is not legal advice. It was drafted directly by the tenant with automated assistance. Only a licensed Texas attorney can advise you on what will happen in your specific case. If you need a lawyer, contact legal aid or a tenant-rights organization.
`;
}

/**
 * Builds the HONEST PATH / NEGOTIATION letter for fixtures with zero violations.
 * Does NOT invent violations. States clearly that no checklist failure was found.
 */
export function generateNegotiationLetter(i: {
  facts: ExtractedFacts;
  deadline: DeadlineResult | null;
  generatedAtIso?: string;
}): string {
  const tenant = i.facts.tenant_name || "The Tenant";
  const landlordRaw = i.facts.landlord_name || "The Landlord / Property Manager";
  const landlordFirst = landlordRaw.split(" ")[0] || "Property Manager";
  const dateStr = i.facts.date_issued ? `on ${i.facts.date_issued}` : "recently";

  return `
${new Date(i.generatedAtIso || new Date().toISOString()).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}

${tenant}
[Your Unit or Address]
${i.facts.state ? `${i.facts.state}` : ""}

${landlordRaw}
[Landlord or Management Office Address]

RE: Response and Request for Good-Faith Discussion — Texas Property Code § 24.005

Dear ${landlordFirst}:

I received the notice you sent ${dateStr}. I have checked it against Texas Property Code § 24.005 — the state law that controls notices to vacate. You can read the law here: https://statutes.capitol.texas.gov/Docs/PR/htm/PR.24.htm

Using that checklist, I did not find the same checklist problems the tool was designed to catch. This does not mean the notice is perfect in every way, and it is not legal advice. It simply means I did not see the errors that would make it clearly defective.

This is legal information, not legal advice. Even so, I want to solve this without going to court. I am asking for [a payment plan / a repair schedule / a written agreement / other practical solution]. Let us talk before anyone files papers.

Sincerely,

${tenant}
Tenant — [Unit / Property Address]

---
WHAT THIS MEANS IN SIMPLE WORDS:
This letter says: "I checked your paper using the state rules. I did not find the big mistakes the computer was looking for. But I still want to work with you. Let us talk and find a plan instead of fighting in court."
---
IMPORTANT DISCLAIMER — READ THIS:
This letter is not legal advice. It was drafted directly by the tenant with automated assistance. Only a licensed Texas attorney can advise you on your specific case.
`;
}