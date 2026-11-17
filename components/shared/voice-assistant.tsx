"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { speakUrdu } from "@/lib/speech";
import { Button } from "@/components/ui/button";

/* ── Minimal Web Speech API typings (not in the DOM lib) ─────────────────── */
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SRAlternative;
}
interface SRResultList {
  readonly length: number;
  [index: number]: SRResult;
}
interface SREvent {
  readonly resultIndex: number;
  readonly results: SRResultList;
}
interface SRErrorEvent {
  readonly error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Msg {
  role: "user" | "assistant";
  text: string;
}

export interface VoiceContext {
  pairLabel?: string;
  direction?: "BUY" | "SELL" | null;
  confidence?: number | null;
  expirySeconds?: number;
  phase?: string;
}

/**
 * Two-way voice assistant: the user speaks (Web Speech recognition, Urdu), the
 * reply is generated server-side (Groq Llama, Urdu) and read back aloud. Fully
 * free and on-device for the voice I/O; the brain lives in /api/voice-chat.
 */
export function VoiceAssistant({
  userName,
  context,
}: {
  userName: string;
  context: VoiceContext;
}) {
  const [open, setOpen] = useState(false);
  // Resolved once on first render; only read after the user opens the call
  // (client-side), so the server/client difference never reaches the DOM.
  const [supported, setSupported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [interim, setInterim] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const contextRef = useRef(context);
  const messagesRef = useRef<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    messagesRef.current = messages;
    // keep the transcript scrolled to the latest line
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, interim, thinking]);

  const sendToAI = useCallback(
    async (text: string) => {
      const userMsg: Msg = { role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);
      try {
        const history = [...messagesRef.current, userMsg]
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.text }));
        const res = await fetch("/api/voice-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userName,
            context: contextRef.current,
          }),
        });
        const data = (await res.json()) as { reply?: string };
        const reply = data.reply?.trim() || "معاف کیجیے، دوبارہ کوشش کریں۔";
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        speakUrdu(reply);
      } catch {
        const reply = "معاف کیجیے، کنکشن میں مسئلہ ہے۔ دوبارہ کوشش کریں۔";
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        speakUrdu(reply);
      } finally {
        setThinking(false);
      }
    },
    [userName]
  );

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    try {
      window.speechSynthesis?.cancel(); // don't talk over the mic
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    rec.lang = "ur-PK";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const t = finalText.trim();
      if (t) void sendToAI(t);
    };
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const openCall = useCallback(() => {
    setOpen(true);
    const name = userName.trim() || "دوست";
    const greet = `السلام علیکم ${name}! میں آپ کا اے آئی ٹریڈنگ اسسٹنٹ ہوں۔ مائیک دبا کر اردو میں بات کریں، میں سن رہا ہوں۔`;
    setMessages([{ role: "assistant", text: greet }]);
    speakUrdu(greet);
  }, [userName]);

  const endCall = useCallback(() => {
    setOpen(false);
    setListening(false);
    setInterim("");
    setThinking(false);
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  // Stop everything if the component unmounts mid-call.
  useEffect(
    () => () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    },
    []
  );

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={openCall}
        className="w-full gap-2 sm:w-auto"
      >
        <Phone className="size-4 text-positive" />
        AI se Urdu mein baat karein
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="End call"
        onClick={endCall}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI voice assistant"
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-primary-muted text-primary">
              <Bot className="size-4.5" />
              {(listening || thinking) && (
                <span className="absolute inset-0 rounded-full border border-primary/40 motion-safe:animate-ping" />
              )}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">AI Assistant</p>
              <p className="text-[11px] text-muted-foreground">
                {listening
                  ? "سن رہا ہوں…"
                  : thinking
                    ? "سوچ رہا ہوں…"
                    : "اردو / ہندی · Live"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={endCall}
            aria-label="End call"
            className="flex size-9 items-center justify-center rounded-full bg-negative/10 text-negative transition-colors hover:bg-negative/20"
          >
            <PhoneOff className="size-4" />
          </button>
        </div>

        {/* Transcript */}
        <div
          ref={scrollRef}
          dir="rtl"
          className="max-h-[42vh] min-h-[180px] space-y-2.5 overflow-y-auto px-4 py-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex items-end gap-2",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  m.role === "user"
                    ? "bg-surface text-muted-foreground"
                    : "bg-primary-muted text-primary"
                )}
              >
                {m.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </span>
              <p
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-surface text-foreground"
                    : "bg-primary/10 text-foreground"
                )}
              >
                {m.text}
              </p>
            </div>
          ))}

          {interim && (
            <div className="flex flex-row-reverse items-end gap-2 opacity-60">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground">
                <User className="size-3.5" />
              </span>
              <p className="max-w-[80%] rounded-2xl bg-surface px-3 py-2 text-sm italic leading-relaxed text-muted-foreground">
                {interim}
              </p>
            </div>
          )}

          {thinking && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                <Bot className="size-3.5" />
              </span>
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
        </div>

        {/* Mic control */}
        <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-4">
          {supported ? (
            <>
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={thinking}
                aria-label={listening ? "Stop" : "Speak"}
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50",
                  listening ? "bg-negative" : "bg-positive"
                )}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-full bg-negative/40 motion-safe:animate-ping" />
                )}
                <Mic className="relative size-7" />
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                {listening
                  ? "بولیں… دوبارہ دبانے پر رک جائے گا"
                  : "مائیک دبائیں اور اردو میں بولیں"}
              </p>
            </>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Aap ka browser voice input support nahi karta. Chrome, Edge ya
              Android par kholein.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
