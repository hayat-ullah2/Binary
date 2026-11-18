/**
 * Browser text-to-speech helpers. Uses the free, on-device Web Speech API — no
 * server, no API key.
 *
 * Accent strategy: PREFER an Urdu (ur) voice reading the Urdu Nastaliq text, so
 * the user hears a natural Pakistani-Urdu accent (available on most Android
 * phones and in Chrome's Google voices). Only when no Urdu voice is installed do
 * we fall back to a Hindi (hi) voice reading Hindi Devanagari text — that keeps
 * desktops without an Urdu voice working, at the cost of an Indian-Hindi accent.
 */

/** First installed voice whose language starts with `prefix` (e.g. "ur", "hi"). */
function findVoice(prefix: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ?? null;
}

/**
 * The best speaking setup for this device: Urdu (Pakistani accent) when an Urdu
 * voice is installed, else Hindi. `voiceLang` is sent to the server so the model
 * replies in just that one script (half the tokens, faster + streamable).
 */
export function pickVoiceSetup(): {
  voiceLang: "ur" | "hi";
  voice: SpeechSynthesisVoice | null;
  lang: string;
} {
  const ur = findVoice("ur");
  if (ur) return { voiceLang: "ur", voice: ur, lang: "ur-PK" };
  return { voiceLang: "hi", voice: findVoice("hi"), lang: "hi-IN" };
}

/**
 * Speak a message, choosing the most natural voice available: Urdu (Pakistani
 * accent, Nastaliq text) when present, else Hindi (Devanagari text). Pass both
 * scripts of the SAME message. `onEnd` fires when speech finishes (or at once if
 * speech is unavailable) — used by the live voice loop to resume listening.
 */
export function speakUrduHindi(
  urdu: string,
  hindi: string,
  opts?: { onEnd?: () => void }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts?.onEnd?.();
    return;
  }
  const urVoice = findVoice("ur");
  const hiVoice = urVoice ? null : findVoice("hi");
  const useUrdu = urVoice !== null;
  try {
    window.speechSynthesis.cancel(); // interrupt any ongoing speech
    const u = new SpeechSynthesisUtterance(useUrdu ? urdu : hindi);
    u.lang = useUrdu ? "ur-PK" : "hi-IN";
    const voice = urVoice ?? hiVoice;
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
