import { splitHighlight } from "@/lib/ui/highlight";

export function HighlightedText({ text }: { text: string }) {
  return (
    <>
      {splitHighlight(text).map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-slate-900">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}