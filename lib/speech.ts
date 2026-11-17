/**
 * Browser text-to-speech helpers for Urdu/Hindi. Uses the free, on-device Web
 * Speech API — no server, no API key. Spoken Hindustani is near-identical across
 * Urdu and Hindi, so a Hindi voice is a sensible fallback when no Urdu voice is
 * installed on the device.
 */

/** Best available Urdu voice, falling back to Hindi, else the browser default. */
export function pickUrduVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ??
    null
  );
}

/** Speak Urdu/Hindi text aloud. Silently no-ops where speech isn't available. */
export function speakUrdu(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel(); // interrupt any ongoing speech
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ur-PK";
    const voice = pickUrduVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95; // a touch slower reads Urdu more naturally
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* speech not available — ignore */
  }
}
