"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, Pause, Bot } from "lucide-react";
import { speakUrduHindi, pickVoiceSetup } from "@/lib/speech";

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

export interface SignalPrompt {
  key: number; // bump to trigger a fresh auto-started announcement
  direction: "BUY" | "SELL";
}

/**
 * Hands-free voice assistant. It auto-starts whenever a new signal is generated
 * (via `signalPrompt`): the AI announces the call in Urdu and then listens, so
 * the user converses back-and-forth without pressing anything. Rendered as a
 * compact inline bar — no modal over the page. Voice I/O is free and on-device
 * (Web Speech API); the brain lives in /api/voice-chat.
 */
export function VoiceAssistant({
  userName,
  context,
  signalPrompt,
}: {
  userName: string;
  context: VoiceContext;
  /** When `key` changes, auto-start the call and announce the new signal. */
  signalPrompt?: SignalPrompt | null;
}) {
  const [ambient, setAmbient] = useState(false); // call active / bar visible
  const [live, setLive] = useState(false); // hands-free loop running (not paused)
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRef = useRef(false);
  const handleUserTextRef = useRef<((t: string) => void) | null>(null);
  const beginListeningRef = useRef<(() => void) | null>(null);
  const contextRef = useRef(context);
  const messagesRef = useRef<Msg[]>([]);
  const userNameRef = useRef(userName);
  const signalPromptRef = useRef(signalPrompt);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);
  useEffect(() => {
    signalPromptRef.current = signalPrompt;
  }, [signalPrompt]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    // Hindi recognition is widely supported (incl. desktop Chrome) and captures
    // everyday Urdu speech well; ur-PK is missing on most desktops.
    rec.lang = "hi-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    let fatal = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
      }
    };
    rec.onerror = (ev) => {
      // Mic permission denied is fatal; 'no-speech'/'aborted' are normal.
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        fatal = true;
      }
    };
    rec.onend = () => {
      setListening(false);
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
      const history = [...messagesRef.current, userMsg]
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.text }));
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);

      // One voice/script for the whole turn — the server streams in that script
      // so we can start speaking on the first finished sentence.
      const setup = pickVoiceSetup();
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }

      let assistantText = "";
      let spokenUpTo = 0;
      let pending = 0; // utterances still queued/speaking
      let streamDone = false;
      let resumed = false;
      let started = false;

      const maybeResume = () => {
        if (!streamDone || pending > 0 || resumed) return;
        resumed = true;
        setSpeaking(false);
        if (liveRef.current)
          restartTimerRef.current = setTimeout(() => beginListening(), 150);
      };
      const speakChunk = (chunk: string) => {
        const t = chunk.trim();
        if (!t) return;
        pending++;
        try {
          const u = new SpeechSynthesisUtterance(t);
          u.lang = setup.lang;
          if (setup.voice) u.voice = setup.voice;
          u.rate = 1;
          u.pitch = 1;
          const done = () => {
            pending = Math.max(0, pending - 1);
            maybeResume();
          };
          u.onend = done;
          u.onerror = done;
          window.speechSynthesis.speak(u); // queues after any in-progress chunk
        } catch {
          pending = Math.max(0, pending - 1);
        }
      };
      const isBoundary = (c: string) =>
        c === "۔" || c === "।" || c === "." || c === "!" || c === "?" || c === "؟";
      const flush = (final: boolean) => {
        let last = spokenUpTo;
        for (let i = spokenUpTo; i < assistantText.length; i++) {
          if (isBoundary(assistantText[i])) {
            speakChunk(assistantText.slice(last, i + 1));
            last = i + 1;
          }
        }
        spokenUpTo = last;
        if (final && spokenUpTo < assistantText.length) {
          speakChunk(assistantText.slice(spokenUpTo));
          spokenUpTo = assistantText.length;
        }
      };

      try {
        const res = await fetch("/api/voice-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userName,
            context: contextRef.current,
            voiceLang: setup.voiceLang,
          }),
        });
        if (!res.body) throw new Error("no stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          if (!started) {
            started = true;
            setThinking(false);
            setSpeaking(true);
          }
          assistantText += chunk;
          flush(false); // speak each completed sentence as it arrives
        }
        setThinking(false);
        streamDone = true;
        flush(true);
        if (assistantText.trim())
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: assistantText.trim() },
          ]);
        maybeResume();
      } catch {
        setThinking(false);
        const err =
          setup.voiceLang === "ur"
            ? "معاف کیجیے، کنکشن میں مسئلہ ہے۔ دوبارہ کوشش کریں۔"
            : "माफ़ कीजिए, कनेक्शन में समस्या है। दोबारा कोशिश करें।";
        setMessages((prev) => [...prev, { role: "assistant", text: err }]);
        setSpeaking(true);
        streamDone = true;
        speakChunk(err);
        maybeResume();
      }
    },
    [userName, beginListening]
  );

  useEffect(() => {
    handleUserTextRef.current = handleUserText;
  }, [handleUserText]);

  // Start (or continue) the call with an assistant line — speak it (Urdu voice
  // when available, else Hindi), then resume hands-free listening when it ends.
  const startWithMessage = useCallback(
    (display: string, speak: string, fresh: boolean) => {
      setAmbient(true);
      goLive(true);
      setSpeaking(true);
      setMessages((prev) =>
        fresh
          ? [{ role: "assistant", text: display }]
          : [...prev, { role: "assistant", text: display }]
      );
      speakUrduHindi(display, speak, {
        onEnd: () => {
          setSpeaking(false);
          if (liveRef.current)
            restartTimerRef.current = setTimeout(() => beginListening(), 200);
        },
      });
    },
    [goLive, beginListening]
  );
  const startRef = useRef(startWithMessage);
  useEffect(() => {
    startRef.current = startWithMessage;
  }, [startWithMessage]);

  // Auto-start the call and announce whenever a NEW signal is generated.
  const signalKey = signalPrompt?.key ?? 0;
  useEffect(() => {
    if (!signalKey) return;
    const sp = signalPromptRef.current;
    if (!sp) return;
    const nameU = userNameRef.current.trim() || "دوست";
    const nameHi = userNameRef.current.trim() || "दोस्त";
    const display =
      sp.direction === "BUY"
        ? `${nameU}، آپ کا نیا سگنل اوپر یعنی خرید کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`
        : `${nameU}، آپ کا نیا سگنل نیچے یعنی فروخت کا ہے۔ کیا آپ یہ ٹریڈ لیں گے؟`;
    const speak =
      sp.direction === "BUY"
        ? `${nameHi}, आपका नया सिग्नल ऊपर यानी खरीद का है। क्या आप यह ट्रेड लेंगे?`
        : `${nameHi}, आपका नया सिग्नल नीचे यानी बिक्री का है। क्या आप यह ट्रेड लेंगे?`;
    // Defer so no setState runs synchronously in the effect body.
    const t = setTimeout(() => startRef.current?.(display, speak, true), 0);
    return () => clearTimeout(t);
  }, [signalKey]);

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
    setAmbient(false);
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

  // Nothing to show until a signal auto-starts the call.
  if (!ambient) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2">
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
        <Bot className="size-4" />
        {(listening || speaking || thinking) && (
          <span className="absolute inset-0 rounded-full border border-primary/40 motion-safe:animate-ping" />
        )}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-semibold text-foreground">
          AI Assistant · Live
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {!live
            ? "روکا گیا"
            : speaking
              ? "بول رہا ہوں…"
              : thinking
                ? "سوچ رہا ہوں…"
                : listening
                  ? "سن رہا ہوں… بولیں"
                  : "…"}
        </p>
      </div>
      <button
        type="button"
        onClick={togglePause}
        aria-label={live ? "Pause" : "Resume"}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-foreground transition-colors hover:bg-muted"
      >
        {live ? <Pause className="size-4" /> : <Mic className="size-4" />}
      </button>
      <button
        type="button"
        onClick={endCall}
        aria-label="End call"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-negative/10 text-negative transition-colors hover:bg-negative/20"
      >
        <PhoneOff className="size-4" />
      </button>
    </div>
  );
}
