const HIGHLIGHT_PATTERNS: RegExp[] = [
  /\b\d+\s*-?\s*days?\b/gi,                                              // "2 days", "3-day"
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\b/gi,  // "three days"
  /\b(?:taped|posted|posting|mailed|hand[- ]delivered|hand[- ]delivery|in person|personal delivery)\b/gi,
];

export interface HighlightPart { text: string; highlighted: boolean; }

export function splitHighlight(text: string): HighlightPart[] {
  // Collect [start, end) ranges from all patterns.
  const ranges: Array<[number, number]> = [];

  for (const pattern of HIGHLIGHT_PATTERNS) {
    // Reset lastIndex before each exec pass so global regexes start from 0.
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push([match.index, match.index + match[0].length]);
      // Prevent infinite loop on zero-length matches (safety guard)
      if (match[0].length === 0) { pattern.lastIndex++; }
    }
    // Reset again after use so the module-level array stays stateless.
    pattern.lastIndex = 0;
  }

  if (ranges.length === 0) {
    return [{ text, highlighted: false }];
  }

  // Sort by start position, then merge overlapping / adjacent ranges.
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    if (merged.length === 0 || s > merged[merged.length - 1][1]) {
      merged.push([s, e]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    }
  }

  // Slice text into parts.
  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (cursor < s) {
      parts.push({ text: text.slice(cursor, s), highlighted: false });
    }
    parts.push({ text: text.slice(s, e), highlighted: true });
    cursor = e;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlighted: false });
  }

  return parts;
}