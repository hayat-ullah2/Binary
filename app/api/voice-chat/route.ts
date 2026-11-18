import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Voice-assistant brain. Streams a short reply (plain text, in the one script
 * the device will speak) so the browser can start talking on the first sentence.
 * Uses Groq's free, fast models when GROQ_API_KEY is set; otherwise falls back
 * to a small built-in intent responder so the feature still works.
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
  /** Script the device will speak in: "ur" (Pakistani Urdu) or "hi" (Hindi). */
  voiceLang?: "ur" | "hi";
}

/** Tiny fallback when no Groq key is configured (or the API fails). */
function scriptedReply(
  userText: string,
  ctx: VoiceContext | undefined,
  name: string,
  lang: "ur" | "hi"
): string {
  const t = userText.toLowerCase();
  const ur = lang === "ur";
  const who = name.trim() || (ur ? "دوست" : "दोस्त");

  if (/salam|assalam|hello|\bhi\b|السلام|سلام|नमस्ते/.test(t)) {
    return ur
      ? `وعلیکم السلام ${who}! میں آپ کا ٹریڈنگ اسسٹنٹ ہوں۔ آپ سگنل کے بارے میں پوچھ سکتے ہیں۔`
      : `वालेकुम अस्सलाम ${who}! मैं आपका ट्रेडिंग असिस्टेंट हूँ। आप सिग्नल के बारे में पूछ सकते हैं।`;
  }
  if (/ha+n|yes|ہاں|لے|لوں|لینا|ok|ٹھیک|हाँ|ही/.test(t)) {
    return ur
      ? `بہترین ${who}! نظم و ضبط کے ساتھ ٹریڈ کریں اور رسک کا خیال رکھیں۔`
      : `बहुत बढ़िया ${who}! अनुशासन के साथ ट्रेड करें और रिस्क का ख्याल रखें।`;
  }
  if (/nahi|no\b|نہیں|نہ|नहीं/.test(t)) {
    return ur
      ? `کوئی بات نہیں ${who}، اگلے اچھے موقع کا انتظار کرتے ہیں۔`
      : `कोई बात नहीं ${who}, अगले अच्छे मौके का इंतज़ार करते हैं।`;
  }
  if (ctx?.direction === "BUY") {
    return ur
      ? `${who}، فی الحال آپ کا سگنل اوپر یعنی خرید کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`
      : `${who}, फ़िलहाल आपका सिग्नल ऊपर यानी खरीद का है। क्या आप यह ट्रेड लेंगे?`;
  }
  if (ctx?.direction === "SELL") {
    return ur
      ? `${who}، فی الحال آپ کا سگنل نیچے یعنی فروخت کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`
      : `${who}, फ़िलहाल आपका सिग्नल नीचे यानी बिक्री का है। क्या आप यह ट्रेड लेंगे?`;
  }
  return ur
    ? `${who}، پہلے ایک سگنل جنریٹ کریں، پھر میں اس کے بارے میں بتا سکوں گا۔`
    : `${who}, पहले एक सिग्नल जनरेट करें, फिर मैं उसके बारे में बता सकूँगा।`;
}

/** Plain-text streaming response from a fixed string. */
function textStream(text: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
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
  const lang: "ur" | "hi" = body.voiceLang === "hi" ? "hi" : "ur";
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return textStream(scriptedReply(lastUser, context, userName, lang));
  }

  const ctxLine = context
    ? `Live signal context — pair: ${context.pairLabel ?? "?"}, direction: ${
        context.direction ?? "none generated yet"
      }, confidence: ${context.confidence ?? "?"}%, expiry window: ${
        context.expirySeconds ?? "?"
      }s, phase: ${context.phase ?? "idle"}.`
    : "No active signal yet.";

  const script =
    lang === "ur"
      ? "Urdu using Urdu (Nastaliq) script, in natural everyday Pakistani Urdu vocabulary"
      : "Hindi using Devanagari script";

  const system = [
    "You are a warm, friendly human-like voice trading assistant for a Quotex-style binary/forex signals web app called SHARP X REBEL.",
    "This is a live phone call. ALWAYS answer the user's LATEST message directly and specifically.",
    "NEVER repeat your previous sentence and never re-ask a question the user already answered. If the user says yes/no or changes the topic, respond to THAT and move the conversation forward.",
    `Reply in ${script}. Keep it VERY short — 1 to 2 spoken sentences — it is read aloud.`,
    "Reply with ONLY the spoken sentence(s). No quotes, no JSON, no extra text.",
    `Address the user by name sometimes; the user's name is "${userName || "dost"}".`,
    "You do NOT place or execute trades — the user places trades themselves. Never say a trade was taken/done; only discuss whether they should.",
    "You help with the current signal (up/down), confidence, expiry, whether to take the trade, simple explanations, and risk discipline. Never promise guaranteed profit; signals are illustrative.",
    ctxLine,
  ].join(" ");

  // Fastest-first: qwen has no reasoning overhead (quickest first token).
  const models = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
  for (const model of models) {
    try {
      const upstream = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.6,
            max_tokens: 180,
            stream: true,
            ...(model.startsWith("openai/gpt-oss")
              ? { reasoning_effort: "low" }
              : {}),
            messages: [
              { role: "system", content: system },
              ...messages.slice(-8),
            ],
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!upstream.ok || !upstream.body) continue;

      // Transform Groq's SSE into a plain-text token stream for the client.
      const upstreamBody = upstream.body;
      const stream = new ReadableStream({
        async start(controller) {
          const reader = upstreamBody.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const l = line.trim();
                if (!l.startsWith("data:")) continue;
                const data = l.slice(5).trim();
                if (data === "[DONE]") {
                  controller.close();
                  return;
                }
                try {
                  const json = JSON.parse(data) as {
                    choices?: { delta?: { content?: string } }[];
                  };
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) controller.enqueue(encoder.encode(delta));
                } catch {
                  /* ignore keep-alives / partial lines */
                }
              }
            }
          } catch {
            /* upstream dropped — just end the stream */
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch {
      // network/timeout — try the next model
    }
  }

  return textStream(scriptedReply(lastUser, context, userName, lang));
}
