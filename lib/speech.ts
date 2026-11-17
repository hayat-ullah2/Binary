/**
 * Browser text-to-speech helpers. Uses the free, on-device Web Speech API — no
 * server, no API key. We speak with a HINDI voice and Devanagari text because
 * spoken Hindustani is identical to everyday Urdu, and Hindi voices are far more
 * widely installed (desktop Chrome, Android) than Urdu voices — Urdu/Nastaliq
 * TTS is missing on most desktops, which is why we standardise on Hindi here.
 * The user still SEES Urdu (Nastaliq) in the UI; only the spoken text is Hindi.
 */

/** Best available Hindi voice, falling back to Urdu, else the browser default. */
export function pickSpeechVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ??
    null
  );
}

/**
 * Speak text aloud (expects Hindi/Devanagari for best cross-device results).
 * Silently no-ops where speech isn't available. `onEnd` fires when speech
 * finishes (or immediately if speech is unavailable or errors) — used by the
 * live voice loop to resume listening afterwards.
 */
export function speakUrdu(text: string, opts?: { onEnd?: () => void }): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts?.onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel(); // interrupt any ongoing speech
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    const voice = pickSpeechVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95; // a touch slower reads more naturally
    u.pitch = 1;
    if (opts?.onEnd) {
      u.onend = () => opts.onEnd?.();
      u.onerror = () => opts.onEnd?.();
    }
    window.speechSynthesis.speak(u);
  } catch {
    opts?.onEnd?.();
  }
}
