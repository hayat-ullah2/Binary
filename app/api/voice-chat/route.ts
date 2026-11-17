import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Voice-assistant brain. Takes the conversation so far + the live signal context
 * and returns a short Urdu reply to be spoken by the browser. Uses Groq's free
 * Llama 3.3 70B (OpenAI-compatible) when GROQ_API_KEY is set; otherwise falls
 * back to a small built-in Urdu intent responder so the feature still works.
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface VoiceContext {
  pairLabel?: string;
  direction?: "BUY" | "SELL" | null;
  confidence?: number | null;
  expirySeconds?: number;
  phase?: string;
}

interface Body {
  messages?: ChatMessage[];
  userName?: string;
  context?: VoiceContext;
}

/**
 * Tiny fallback when no Groq key is configured (or the API fails). Returns both
 * an Urdu line (shown on screen) and a Hindi line (spoken by TTS).
 */
function scriptedReply(
  userText: string,
  ctx: VoiceContext | undefined,
  name: string
): { display: string; speak: string } {
  const t = userText.toLowerCase();
  const who = name.trim() || "دوست";
  const whoHi = name.trim() || "दोस्त";

  if (/salam|assalam|hello|\bhi\b|السلام|سلام|नमस्ते/.test(t)) {
    return {
      display: `وعلیکم السلام ${who}! میں آپ کا ٹریڈنگ اسسٹنٹ ہوں۔ آپ مجھ سے سگنل کے بارے میں پوچھ سکتے ہیں۔`,
      speak: `वालेकुम अस्सलाम ${whoHi}! मैं आपका ट्रेडिंग असिस्टेंट हूँ। आप मुझसे सिग्नल के बारे में पूछ सकते हैं।`,
    };
  }
  if (/ha+n|yes|ہاں|لے|لوں|لینا|ok|ٹھیک|हाँ|ही/.test(t)) {
    return {
      display: `بہترین ${who}! نظم و ضبط کے ساتھ ٹریڈ کریں اور رسک کا خیال رکھیں۔`,
      speak: `बहुत बढ़िया ${whoHi}! अनुशासन के साथ ट्रेड करें और रिस्क का ख्याल रखें।`,
    };
  }
  if (/nahi|no\b|نہیں|نہ|नहीं/.test(t)) {
    return {
      display: `کوئی بات نہیں ${who}، اگلے اچھے موقع کا انتظار کرتے ہیں۔`,
      speak: `कोई बात नहीं ${whoHi}, अगले अच्छे मौके का इंतज़ार करते हैं।`,
    };
  }
  if (ctx?.direction === "BUY") {
    return {
      display: `${who}، فی الحال آپ کا سگنل اوپر یعنی خرید کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`,
      speak: `${whoHi}, फ़िलहाल आपका सिग्नल ऊपर यानी खरीद का है। क्या आप यह ट्रेड लेंगे?`,
    };
  }
  if (ctx?.direction === "SELL") {
    return {
      display: `${who}، فی الحال آپ کا سگنل نیچے یعنی فروخت کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`,
      speak: `${whoHi}, फ़िलहाल आपका सिग्नल नीचे यानी बिक्री का है। क्या आप यह ट्रेड लेंगे?`,
    };
  }
  return {
    display: `${who}، پہلے ایک سگنل جنریٹ کریں، پھر میں آپ کو اس کے بارے میں بتا سکوں گا۔`,
    speak: `${whoHi}, पहले एक सिग्नल जनरेट करें, फिर मैं आपको उसके बारे में बता सकूँगा।`,
  };
}

/** Pull the first {...} JSON object out of a model reply, tolerating stray text. */
function extractJson(content: string): { display?: string; speak?: string } | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const userName = typeof body.userName === "string" ? body.userName : "";
  const context = body.context;
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    const s = scriptedReply(lastUser, context, userName);
    return NextResponse.json({ reply: s.display, speak: s.speak, source: "scripted" });
  }

  const ctxLine = context
    ? `Live signal context — pair: ${context.pairLabel ?? "?"}, direction: ${
        context.direction ?? "none generated yet"
      }, confidence: ${context.confidence ?? "?"}%, expiry window: ${
        context.expirySeconds ?? "?"
      }s, phase: ${context.phase ?? "idle"}.`
    : "No active signal yet.";

  const system = [
    "You are a warm, friendly voice trading assistant for a Quotex-style binary/forex signals web app called SHARP X REBEL.",
    "Keep every reply very short — 1 to 2 spoken sentences — because it is read aloud by text-to-speech.",
    `Speak like a human on a phone call. Address the user by name when natural; the user's name is "${userName || "dost"}".`,
    "Be conversational: ask the user whether they'll take the current trade, how they feel, or if they want a new signal.",
    "You help ONLY with this app: the current signal (up/down), confidence, expiry, whether to take the trade, and basic risk discipline. If asked something unrelated, gently steer back to trading.",
    "Never promise guaranteed profit; note that signals are illustrative when relevant.",
    "OUTPUT FORMAT: respond with ONLY a JSON object, no other text, exactly like:",
    '{"display":"<your reply in Urdu Nastaliq script>","speak":"<the SAME reply written in Hindi Devanagari script>"}',
    "Both fields must carry the same message — display in Urdu for the screen, speak in Hindi for the voice.",
    ctxLine,
  ].join(" ");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, ...messages.slice(-8)],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty reply");
    const parsed = extractJson(content);
    const display = parsed?.display?.trim() || content;
    const speak = parsed?.speak?.trim() || display;
    return NextResponse.json({ reply: display, speak, source: "groq" });
  } catch {
    const s = scriptedReply(lastUser, context, userName);
    return NextResponse.json({ reply: s.display, speak: s.speak, source: "scripted" });
  }
}
