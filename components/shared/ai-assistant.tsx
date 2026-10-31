"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Chat content ──────────────────────────────────────────────────────── */

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
}

/** Quick-prompt chips and their canned answers. */
const QUICK: { chip: string; answer: string }[] = [
  {
    chip: "Strategies",
    answer:
      "There are 5 built-in strategies:\n• Trend Follower — 72% win, medium risk\n• Mean Reversion — 66%, low risk\n• Breakout Hunter — 69%, high risk\n• Scalp AI — 63%, high risk\n• News Guard — protective (pauses around news)\nEnable the ones you trust from the Strategies chip.",
  },
  {
    chip: "Management",
    answer:
      "Recommended risk setup:\n• Risk per trade: 1% of balance\n• Daily loss limit: 5%\n• Max open trades: 3\n• Position sizing: fixed % of balance\nThis keeps drawdowns controlled while letting winners run.",
  },
  {
    chip: "Automation",
    answer:
      "Auto-trade can place trades from qualifying signals within your limits. You choose the trading sessions (e.g. London + New York), the allowed pairs, a max trades/day cap, and a stop-after-consecutive-losses guard.",
  },
  {
    chip: "Best pairs now",
    answer:
      "Based on current momentum and volatility, the engine favours EUR/USD, GBP/USD and XAU/USD (gold). Majors are the most reliable during the London–New York overlap.",
  },
  {
    chip: "How it works",
    answer:
      "The engine blends classic technical rules — EMA(9/21) crossover, RSI and MACD — with your risk settings to produce BUY / SELL signals with a confidence score. You always stay in control of which strategies run.",
  },
];

const GREETING =
  "Hi! I'm your SHARP X REBEL AI assistant. Tap a chip below to learn about strategies, risk management, automation and more.";

function fallbackAnswer(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("risk") || t.includes("manage"))
    return QUICK[1].answer;
  if (t.includes("auto")) return QUICK[2].answer;
  if (t.includes("pair") || t.includes("buy") || t.includes("sell"))
    return QUICK[3].answer;
  if (t.includes("strateg")) return QUICK[0].answer;
  return "I can help with strategies, risk management, automation and which pairs look best. Try one of the chips below, or ask about any of those topics.";
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "ai", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the conversation scrolled to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  function respond(userText: string, answer: string) {
    const uid = idRef.current++;
    setMessages((m) => [...m, { id: uid, role: "user", text: userText }]);
    setTyping(true);
    window.setTimeout(() => {
      const aid = idRef.current++;
      setMessages((m) => [...m, { id: aid, role: "ai", text: answer }]);
      setTyping(false);
    }, 650);
  }

  function onChip(chip: string, answer: string) {
    respond(chip, answer);
  }

  function onSend() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    respond(q, fallbackAnswer(q));
  }

  return (
    <>
      {/* Floating toggle */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            aria-label="Open AI assistant"
            className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="size-6" />
            <span className="absolute -right-0.5 -top-0.5 flex size-3.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-70" />
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-background bg-positive" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
              role="dialog"
              aria-label="AI assistant"
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Bot className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">AI Assistant</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-positive" />
                    Online · strategies, risk & automation
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Collapse assistant"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <Bubble key={m.id} role={m.role} text={m.text} />
                ))}
                {typing && <TypingBubble />}
              </div>

              {/* Chips */}
              <div className="border-t border-border px-4 pt-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Quick questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <button
                      key={q.chip}
                      type="button"
                      onClick={() => onChip(q.chip, q.answer)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-muted hover:text-primary"
                    >
                      {q.chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSend();
                }}
                className="flex items-center gap-2 p-4"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the assistant…"
                  className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                  <Send className="size-4" />
                </Button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, text }: { role: "user" | "ai"; text: string }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <span className="mr-2 mt-0.5 flex size-7 shrink-0 items-center justify-center self-start rounded-full bg-primary-muted text-primary">
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-card text-foreground border border-border"
        )}
      >
        {text}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <span className="mr-2 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
        <Bot className="size-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
