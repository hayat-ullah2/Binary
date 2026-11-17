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

/** Tiny Urdu fallback when no Groq key is configured (or the API fails). */
function scriptedReply(userText: string, ctx: VoiceContext | undefined, name: string): string {
  const t = userText.toLowerCase();
  const who = name.trim() || "دوست";
  const dir =
    ctx?.direction === "BUY"
      ? "اوپر یعنی خرید"
      : ctx?.direction === "SELL"
        ? "نیچے یعنی فروخت"
        : null;

  if (/salam|assalam|hello|\bhi\b|السلام|سلام/.test(t)) {
    return `وعلیکم السلام ${who}! میں آپ کا ٹریڈنگ اسسٹنٹ ہوں۔ آپ مجھ سے سگنل کے بارے میں پوچھ سکتے ہیں۔`;
  }
  if (/ha+n|yes|ہاں|لے|لوں|لینا|ok|ٹھیک/.test(t)) {
    return `بہترین ${who}! نظم و ضبط کے ساتھ ٹریڈ کریں اور رسک کا خیال رکھیں۔`;
  }
  if (/nahi|no\b|نہیں|نہ/.test(t)) {
    return `کوئی بات نہیں ${who}، اگلے اچھے موقع کا انتظار کرتے ہیں۔`;
  }
  if (dir) {
    return `${who}، فی الحال آپ کا سگنل ${dir} کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`;
  }
  return `${who}، پہلے ایک سگنل جنریٹ کریں، پھر میں آپ کو اس کے بارے میں بتا سکوں گا۔`;
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
    return NextResponse.json({
      reply: scriptedReply(lastUser, context, userName),
      source: "scripted",
    });
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
    "ALWAYS reply in Urdu using Urdu (Nastaliq) script.",
    "Keep every reply very short — 1 to 2 spoken sentences — because it is read aloud by text-to-speech.",
    `Speak like a human on a phone call. Address the user by name when natural; the user's name is "${userName || "ٹریڈر"}".`,
    "Be conversational: ask the user whether they'll take the current trade, how they feel, or if they want a new signal.",
    "You help ONLY with this app: the current signal (up/down), confidence, expiry, whether to take the trade, and basic risk discipline. If asked something unrelated, gently steer back to trading, in Urdu.",
    "Never promise guaranteed profit; note that signals are illustrative when relevant.",
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
        max_tokens: 160,
        messages: [{ role: "system", content: system }, ...messages.slice(-8)],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty reply");
    return NextResponse.json({ reply, source: "groq" });
  } catch {
    return NextResponse.json({
      reply: scriptedReply(lastUser, context, userName),
      source: "scripted",
    });
  }
}
