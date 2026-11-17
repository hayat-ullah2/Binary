"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, Pause, Loader2, Bot, User } from "lucide-react";
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
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [live, setLive] = useState(false); // hands-free loop running (not paused)
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRef = useRef(false);
  const handleUserTextRef = useRef<((t: string) => void) | null>(null);
  const beginListeningRef = useRef<(() => void) | null>(null);
  const contextRef = useRef(context);
  const messagesRef = useRef<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    messagesRef.current = messages;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, interim, thinking, speaking]);

  const goLive = useCallback((v: boolean) => {
    liveRef.current = v;
    setLive(v);
  }, []);

  // Open the mic for one user turn. On a clean end it hands the final text to
  // the AI; if nothing was said (and the call is still live) it keeps waiting.
  const beginListening = useCallback(() => {
    if (!liveRef.current) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    try {
      window.speechSynthesis?.cancel(); // never listen while the AI is talking
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    rec.lang = "ur-PK";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    let fatal = false;
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = (ev) => {
      // Mic permission denied is fatal; 'no-speech'/'aborted' are normal.
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        fatal = true;
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (fatal) {
        goLive(false);
        return;
      }
      const t = finalText.trim();
      if (t) {
        handleUserTextRef.current?.(t);
      } else if (liveRef.current) {
        // silence — keep the line open and listen again shortly
        restartTimerRef.current = setTimeout(
          () => beginListeningRef.current?.(),
          400
        );
      }
    };
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [goLive]);

  useEffect(() => {
    beginListeningRef.current = beginListening;
  }, [beginListening]);

  const handleUserText = useCallback(
    async (text: string) => {
      const userMsg: Msg = { role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);
      let reply = "معاف کیجیے، دوبارہ کوشش کریں۔";
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
        if (data.reply?.trim()) reply = data.reply.trim();
      } catch {
        reply = "معاف کیجیے، کنکشن میں مسئلہ ہے۔ دوبارہ کوشش کریں۔";
      }
      setThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setSpeaking(true);
      speakUrdu(reply, {
        onEnd: () => {
          setSpeaking(false);
          // Hands-free: resume listening automatically after the AI finishes.
          if (liveRef.current)
            restartTimerRef.current = setTimeout(() => beginListening(), 200);
        },
      });
    },
    [userName, beginListening]
  );

  useEffect(() => {
    handleUserTextRef.current = handleUserText;
  }, [handleUserText]);

  const openCall = useCallback(() => {
    setOpen(true);
    goLive(true);
    const name = userName.trim() || "دوست";
    const greet = `السلام علیکم ${name}! میں آپ کا اے آئی ٹریڈنگ اسسٹنٹ ہوں۔ اب آپ کھل کر اردو میں بات کریں، بٹن دبانے کی ضرورت نہیں۔ بتائیے، آپ کیسے ہیں؟`;
    setMessages([{ role: "assistant", text: greet }]);
    setSpeaking(true);
    speakUrdu(greet, {
      onEnd: () => {
        setSpeaking(false);
        if (liveRef.current)
          restartTimerRef.current = setTimeout(() => beginListening(), 200);
      },
    });
  }, [userName, goLive, beginListening]);

  const stopEverything = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
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
    setListening(false);
    setSpeaking(false);
    setInterim("");
  }, []);

  // Big button: pause (stop listening/speaking but stay in the call) or resume.
  const togglePause = useCallback(() => {
    if (liveRef.current) {
      goLive(false);
      stopEverything();
    } else {
      goLive(true);
      beginListening();
    }
  }, [goLive, beginListening, stopEverything]);

  const endCall = useCallback(() => {
    goLive(false);
    stopEverything();
    setThinking(false);
    setOpen(false);
  }, [goLive, stopEverything]);

  // Stop everything if the component unmounts mid-call.
  useEffect(
    () => () => {
      liveRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
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
              {(listening || thinking || speaking) && (
                <span className="absolute inset-0 rounded-full border border-primary/40 motion-safe:animate-ping" />
              )}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">AI Assistant</p>
              <p className="text-[11px] text-muted-foreground">
                {!live
                  ? "روکا گیا"
                  : speaking
                    ? "بول رہا ہوں…"
                    : thinking
                      ? "سوچ رہا ہوں…"
                      : listening
                        ? "سن رہا ہوں…"
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

        {/* Live control — pause / resume the hands-free conversation */}
        <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-4">
          {supported ? (
            <>
              <button
                type="button"
                onClick={togglePause}
                aria-label={live ? "Pause" : "Resume"}
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95",
                  !live
                    ? "bg-muted-foreground"
                    : speaking
                      ? "bg-primary"
                      : "bg-positive"
                )}
              >
                {live && (listening || speaking) && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full motion-safe:animate-ping",
                      speaking ? "bg-primary/40" : "bg-positive/40"
                    )}
                  />
                )}
                {!live ? (
                  <Mic className="relative size-7" />
                ) : (
                  <Pause className="relative size-7" />
                )}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                {!live
                  ? "روکا گیا — دوبارہ شروع کرنے کے لیے دبائیں"
                  : speaking
                    ? "AI بول رہا ہے…"
                    : thinking
                      ? "AI سوچ رہا ہے…"
                      : "بس بولیں — میں سن رہا ہوں (بٹن دبانے کی ضرورت نہیں)"}
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
