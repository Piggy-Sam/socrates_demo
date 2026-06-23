"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { StarMark } from "@/components/brand/wordmark";
import { createChatSession, persistTurn } from "./actions";

type Turn = {
  id: string;
  role: "user" | "socrates";
  content: string;
};

type ChatMessageWire = { role: "user" | "assistant"; content: string };

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function ChatClient({
  displayName,
  initialTurns = [],
  initialSessionId = null,
}: {
  displayName: string | null;
  initialTurns?: Turn[];
  initialSessionId?: string | null;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const sessionIdRef = useRef<string | null>(initialSessionId);
  const sessionInitRef = useRef<Promise<string> | null>(null);
  const turnsRef = useRef<Turn[]>(turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  turnsRef.current = turns;

  // Keep the latest exchange in view as tokens arrive.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, streaming]);

  // Auto-grow the textarea up to a ceiling.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [draft]);

  const ensureSession = useCallback((): Promise<string> => {
    if (sessionIdRef.current) return Promise.resolve(sessionIdRef.current);
    if (!sessionInitRef.current) {
      sessionInitRef.current = createChatSession()
        .then((id) => {
          sessionIdRef.current = id;
          return id;
        })
        .catch((e) => {
          sessionInitRef.current = null; // allow retry on next send
          throw e;
        });
    }
    return sessionInitRef.current;
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || streaming) return;

    setError(null);
    setDraft("");

    const userTurn: Turn = { id: newId(), role: "user", content: text };
    const socratesTurn: Turn = { id: newId(), role: "socrates", content: "" };
    setTurns((prev) => [...prev, userTurn, socratesTurn]);
    setStreaming(true);

    // Wire history: prior turns + this new user message. The system prompt is
    // prepended server-side and cannot be overridden here.
    const wire: ChatMessageWire[] = [
      ...turnsRef.current
        .filter((t) => t.content.trim())
        .map<ChatMessageWire>((t) => ({
          role: t.role === "socrates" ? "assistant" : "user",
          content: t.content,
        })),
      { role: "user", content: text },
    ];

    let assistantText = "";
    const appendToken = (delta: string) => {
      assistantText += delta;
      setTurns((prev) =>
        prev.map((t) =>
          t.id === socratesTurn.id ? { ...t, content: assistantText } : t,
        ),
      );
    };

    try {
      const res = await fetch("/api/llm/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: wire, stream: true }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Parse the OpenAI SSE stream: lines of `data: {json}` ending in [DONE].
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            buffer = "";
            break;
          }
          try {
            const json = JSON.parse(payload);
            const delta: string | undefined = json?.choices?.[0]?.delta?.content;
            if (delta) appendToken(delta);
          } catch {
            // partial/non-JSON keepalive — ignore
          }
        }
      }
    } catch (err) {
      console.error("[chat] stream error", err);
      setError("Something interrupted that. Try again.");
      // Drop the empty placeholder if Socrates never spoke.
      if (!assistantText) {
        setTurns((prev) => prev.filter((t) => t.id !== socratesTurn.id));
      }
    } finally {
      setStreaming(false);
    }

    // Persist the completed exchange (best-effort; never block the UI). We saved
    // a user `text` above, so persist it regardless of whether Socrates replied;
    // persistTurn() drops empty content, so a blank assistantText safely stores
    // just the user message instead of losing it on refresh.
    try {
      const isNewConversation = !sessionIdRef.current;
      const sessionId = await ensureSession();
      await persistTurn(sessionId, text, assistantText);
      if (isNewConversation) {
        // Promote this brand-new thread to its own resumable URL and surface it
        // in the sidebar. router.replace() moves the app to /chat/<id> (so the
        // router, the address bar, and "New chat" all agree); router.refresh()
        // re-fetches the layout's conversation list. The [id] page re-mounts
        // ChatClient with the just-saved turns from the DB, so nothing is lost.
        router.replace(`/chat/${sessionId}`);
        router.refresh();
      }
    } catch (err) {
      console.error("[chat] persist failed", err);
    }
  }, [draft, streaming, ensureSession, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const empty = turns.length === 0;

  return (
    <div className="flex min-h-[60vh] flex-col">
      {/* transcript */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-6"
        aria-live="polite"
        aria-busy={streaming}
      >
        {empty ? (
          <EmptyState displayName={displayName} reduce={!!reduce} />
        ) : (
          <div className="flex flex-col gap-7">
            <AnimatePresence initial={false}>
              {turns.map((turn, i) => (
                <TurnBlock
                  key={turn.id}
                  turn={turn}
                  reduce={!!reduce}
                  // a quiet breathing dot only while the trailing Socrates turn is still empty
                  pending={
                    streaming &&
                    turn.role === "socrates" &&
                    i === turns.length - 1 &&
                    !turn.content
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {error && (
        <p className="label-mono mb-3 text-marble-dim">{error}</p>
      )}

      {/* composer */}
      <div className="sticky bottom-0 -mx-1 mt-2 border-t border-hairline bg-ink/80 px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm">
        <div className="flex items-end gap-3">
          <div className="flex flex-1 items-start gap-2 rounded-md border border-hairline bg-raised px-3 transition-colors focus-within:border-accent">
            <span
              aria-hidden
              className="select-none pt-3 font-mono-display text-base leading-none text-accent"
            >
              &rsaquo;
            </span>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="What&rsquo;s on your mind?"
              aria-label="Your message to Socrates"
              className="max-h-[200px] min-h-[2.75rem] flex-1 resize-none bg-transparent py-3 pr-1 font-sans text-base text-marble placeholder:text-marble-dim outline-none"
            />
          </div>
          <Button
            type="button"
            variant="gold"
            size="lg"
            onClick={() => void send()}
            disabled={streaming || !draft.trim()}
            aria-label="Send"
            className="aspect-square px-0"
          >
            <ArrowUp strokeWidth={1.8} className="size-5" />
          </Button>
        </div>
        <p className="label-mono mt-2 hidden text-marble-dim sm:block">
          Enter to send &middot; Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}

function TurnBlock({
  turn,
  pending,
  reduce,
}: {
  turn: Turn;
  pending: boolean;
  reduce: boolean;
}) {
  const isUser = turn.role === "user";
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className={isUser ? "" : "pl-1"}
    >
      {isUser ? (
        <div className="flex flex-col items-end">
          <p className="label-mono mb-1.5 text-marble-dim">You</p>
          <p className="text-pretty max-w-[85%] whitespace-pre-wrap rounded-md rounded-tr-sm border border-hairline bg-raised px-4 py-2.5 text-left font-sans text-[1.0625rem] leading-relaxed text-marble">
            {turn.content}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-start">
          <p className="label-mono mb-1.5 flex items-center gap-1.5 text-accent">
            <StarMark size={9} />
            Socrates
          </p>
          {pending ? (
            <ThinkingCursor reduce={reduce} />
          ) : (
            <p className="text-pretty max-w-[88%] whitespace-pre-wrap font-sans text-[1.0625rem] leading-relaxed text-marble">
              {turn.content}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** A quiet terminal cursor while Socrates is thinking — never a "typing" gimmick. */
function ThinkingCursor({ reduce }: { reduce: boolean }) {
  return (
    <span
      className="mt-1 inline-flex items-center"
      role="status"
      aria-label="Socrates is thinking"
    >
      {/* a calm blinking block — the prompt waiting to speak */}
      <span
        aria-hidden
        className={`inline-block rounded-[1px] bg-accent ${
          reduce ? "opacity-60" : "cursor-blink"
        }`}
        style={{ width: "0.5em", height: "1.05em" }}
      />
    </span>
  );
}

function EmptyState({
  displayName,
  reduce,
}: {
  displayName: string | null;
  reduce: boolean;
}) {
  const first = displayName?.trim().split(/\s+/)[0];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex min-h-[40vh] flex-col items-start justify-center"
    >
      <p className="label-mono mb-4 flex items-center gap-1.5 text-marble-dim">
        <StarMark size={11} />
        Socrates ready
      </p>
      <p className="text-balance font-sans text-xl leading-relaxed text-marble sm:text-2xl">
        {first ? `${first}, what's on your mind?` : "What's on your mind?"}
      </p>
      <p className="text-pretty mt-3 max-w-prose font-sans text-base text-marble-dim">
        Start anywhere &mdash; a half-formed thought is enough. He&rsquo;ll
        engage it, press where it&rsquo;s soft, and surface what sharpens it
        &mdash; the thinking stays yours.
      </p>
    </motion.div>
  );
}
