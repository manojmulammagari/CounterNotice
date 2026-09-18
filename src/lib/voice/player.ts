"use client";

import { useCallback, useState } from "react";
import { VOICE_PHRASES } from "./phrases";

export function useVoicePlayer() {
  const [playing, setPlaying] = useState(false);

  const play = useCallback((key: string, fallbackText?: string) => {
    if (typeof window === "undefined") return;
    setPlaying(true);

    const audio = new Audio(`/voice/${key}.mp3`);

    audio.onended = () => setPlaying(false);

    audio.onerror = () => {
      // Fallback: browser speech synthesis (zero cost, zero latency)
      const phrase =
        fallbackText ?? VOICE_PHRASES[key]?.text ?? "CounterNotice result.";
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => setPlaying(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    audio.play().catch((err) => {
      // Autoplay blocked — fall back silently
      console.warn("Audio playback blocked:", err);
      setPlaying(false);
    });
  }, []);

  return { play, playing };
}

/**
 * Returns the correct voice key for a given evaluation.
 * Used by VerdictCard.
 */
export function voiceKeyForResult(
  kind: string,
  violations: number,
  unknowns: number,
): string {
  if (kind === "out_of_jurisdiction" || kind === "unknown_notice_type")
    return "unknown";
  if (violations > 0) return "defective";
  if (unknowns > 0) return "unknown";
  return "clean";
}