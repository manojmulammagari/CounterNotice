#!/usr/bin/env python3
"""
CounterNotice Voice Pre-render Script
Requires: pip install kokoro-tts
Usage:    python scripts/generate-voice.py
Output:   public/voice/*.mp3 + public/voice/*.txt

If Kokoro is not installed the script creates placeholder files so the build
and demo never crash. The UI always falls back to browser SpeechSynthesis.
"""
import os
import sys

PHRASES = [
    ("defective",
     "We found possible problems with this notice. Check the red card. "
     "There are statutory violations listed. You have a deadline to respond."),
    ("clean",
     "We did not find a problem on our checklist. This does not mean the notice "
     "is perfect. Read the green card for your best next step."),
    ("unknown",
     "We could not check everything on this notice. A person needs to look at "
     "the photo or the original paper. Do not wait for an answer that may not come."),
    ("negotiation",
     "This letter asks your landlord to talk instead of going to court. "
     "You are being honest and practical. That builds trust."),
]

os.makedirs("public/voice", exist_ok=True)

# ── Write transcript .txt files first (always) ────────────────────────────────
for key, text in PHRASES:
    with open(f"public/voice/{key}.txt", "w", encoding="utf-8") as f:
        f.write(text)

# ── Try Kokoro; fall back to silent placeholder MP3s ─────────────────────────
try:
    from kokoro import KPipeline  # type: ignore
except ImportError:
    print("Kokoro not installed. Run: pip install kokoro-tts")
    print("Writing silent placeholder MP3 files for demo/build purposes.")
    # Minimal valid MP3 frame so browsers never throw a decode error
    SILENT_MP3 = bytes([
        0xFF, 0xFB, 0x90, 0x00,  # MPEG1 Layer3 frame header (128kbps, 44.1kHz)
        *([0x00] * 413),          # silent frame payload
    ])
    for key, _ in PHRASES:
        with open(f"public/voice/{key}.mp3", "wb") as f:
            f.write(SILENT_MP3)
        print(f"  placeholder -> public/voice/{key}.mp3")
    sys.exit(0)


def main() -> None:
    pipeline = KPipeline(lang_code="a")  # American English
    for key, text in PHRASES:
        generator = pipeline(text, voice="af_heart")
        generator.save(f"public/voice/{key}.mp3")
        print(f"Generated public/voice/{key}.mp3")


if __name__ == "__main__":
    main()