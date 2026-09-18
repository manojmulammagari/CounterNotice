export const VOICE_PHRASES: Record<
  string,
  { key: string; text: string; label: string; simpleExplanation: string }
> = {
  defective: {
    key: "defective",
    text: "We found possible problems with this notice. Check the red card. There are statutory violations listed. You have a deadline to respond.",
    label: "Defect found",
    simpleExplanation:
      "Your paper has mistakes according to Texas law. The red card shows which ones.",
  },
  clean: {
    key: "clean",
    text: "We did not find a problem on our checklist. This does not mean the notice is perfect. Read the green card for your best next step.",
    label: "No checklist problem",
    simpleExplanation:
      "The computer did not find the big mistakes it was looking for. You may still want to talk to a lawyer.",
  },
  unknown: {
    key: "unknown",
    text: "We could not check everything on this notice. A person needs to look at the photo or the original paper. Do not wait for an answer that may not come.",
    label: "Could not check",
    simpleExplanation:
      "The photo was too blurry or we could not tell what kind of paper it was. Ask for help right away.",
  },
  negotiation: {
    key: "negotiation",
    text: "This letter asks your landlord to talk instead of going to court. You are being honest and practical. That builds trust.",
    label: "Ask to talk",
    simpleExplanation:
      "Even when there is no big mistake, talking first is often the best move.",
  },
};

export function getPhraseForResult(
  kind: string,
  violations: number,
  unknowns: number,
): string {
  if (kind === "out_of_jurisdiction") return VOICE_PHRASES.unknown.text;
  if (kind === "unknown_notice_type") return VOICE_PHRASES.unknown.text;
  if (violations > 0) return VOICE_PHRASES.defective.text;
  if (unknowns > 0) return VOICE_PHRASES.unknown.text;
  return VOICE_PHRASES.clean.text;
}