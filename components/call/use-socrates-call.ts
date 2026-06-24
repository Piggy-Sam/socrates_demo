"use client";

import { useCallback, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import type { StarState } from "@/components/sky/breathing-star";
import type { VoiceTokenResponse } from "@/app/api/voice/token/route";

// Phases of the on-demand call, independent of the SDK's lower-level status —
// these drive copy and the breathing star.
export type CallPhase =
  | "idle" // nothing started yet
  | "connecting" // minting token + establishing WebRTC
  | "live" // connected, Socrates is present
  | "ended" // we hung up / the agent left
  | "error"; // something went wrong (mic denied, token fail, …)

export type LiveCaption = {
  /** Stable per-turn id so captions animate in place instead of by-text. */
  id: number;
  role: "user" | "socrates";
  text: string;
};

// How many recent turns the caption band keeps in its rolling buffer.
const CAPTION_BUFFER = 3;

export type SocratesCall = {
  phase: CallPhase;
  /** Drives <BreathingStar state=… /> */
  starState: StarState;
  /** True only while the agent is producing audio. */
  isSpeaking: boolean;
  isMuted: boolean;
  /** The most recent turn, for minimal live captions. */
  lastMessage: LiveCaption | null;
  /** A short rolling buffer of recent turns (oldest → newest). */
  messages: LiveCaption[];
  /** Warm, user-facing error copy (never raw SDK strings). */
  error: string | null;
  start: () => Promise<void>;
  end: () => Promise<void>;
  toggleMute: () => void;
};

/**
 * Wraps ElevenLabs' useConversation for the Socrates on-demand voice surface.
 * MUST be called inside a <ConversationProvider> (CallScreen mounts one).
 *
 * It owns: token minting, WebRTC startSession, mic-permission errors, clean
 * teardown, and the mapping from SDK signals to a calm BreathingStar state.
 */
export function useSocratesCall(): SocratesCall {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  // A short rolling buffer of recent turns; lastMessage is just its tail.
  const [messages, setMessages] = useState<LiveCaption[]>([]);
  // Monotonic turn id so captions key on identity, not text (lets a turn
  // animate in place and avoids flicker on fast exchanges).
  const turnIdRef = useRef(0);
  // Guards double-start (e.g. impatient taps) while the token is in flight.
  const startingRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => {
      startingRef.current = false;
      setPhase("live");
    },
    onDisconnect: () => {
      startingRef.current = false;
      // Don't clobber an error phase with a routine disconnect.
      setPhase((p) => (p === "error" ? p : "ended"));
    },
    onMessage: ({ message, source }) => {
      const text = message?.trim();
      if (!text) return;
      const role: LiveCaption["role"] = source === "ai" ? "socrates" : "user";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        // Same speaker continuing → update that turn in place (so a growing
        // line keeps its id), otherwise push a fresh turn.
        const next =
          last && last.role === role
            ? [...prev.slice(0, -1), { ...last, text }]
            : [...prev, { id: ++turnIdRef.current, role, text }];
        return next.slice(-CAPTION_BUFFER);
      });
    },
    onError: (message) => {
      console.error("[socrates-call] conversation error", message);
      startingRef.current = false;
      setError("The line dropped. Try again in a moment.");
      setPhase("error");
    },
  });

  const { status, isSpeaking, isMuted, setMuted, startSession, endSession } =
    conversation;

  const start = useCallback(async () => {
    if (startingRef.current || phase === "connecting" || phase === "live") {
      return;
    }
    startingRef.current = true;
    setError(null);
    setMessages([]);
    setPhase("connecting");

    // 1) Mint a conversation token server-side (keeps the API key secret).
    let payload: VoiceTokenResponse;
    try {
      const res = await fetch("/api/voice/token", { method: "POST" });
      if (!res.ok) {
        throw new Error(`token endpoint returned ${res.status}`);
      }
      payload = (await res.json()) as VoiceTokenResponse;
      if (!payload?.token) throw new Error("no token in response");
    } catch (err) {
      console.error("[socrates-call] token mint failed", err);
      startingRef.current = false;
      setError("Couldn't reach Socrates. Check your connection and try again.");
      setPhase("error");
      return;
    }

    // 2) Open the session. startSession requests mic permission. Prefer WebRTC
    //    (lowest latency); if that transport can't be established — some
    //    networks/firewalls/older browsers block WebRTC, which connects but
    //    never carries audio — fall back to the WebSocket transport so the call
    //    still works. A mic-permission denial is terminal in either case.
    try {
      await startSession({
        conversationToken: payload.token,
        connectionType: "webrtc",
        dynamicVariables: payload.dynamicVariables,
      });
      return; // onConnect promotes us to "live".
    } catch (errWebrtc) {
      if (isMicPermissionError(errWebrtc)) {
        startingRef.current = false;
        setError(
          "Socrates needs your microphone. Allow access, then try again.",
        );
        setPhase("error");
        return;
      }
      console.warn(
        "[socrates-call] WebRTC connect failed; falling back to WebSocket",
        errWebrtc,
      );
      // Tear down any half-open WebRTC session before retrying.
      try {
        endSession();
      } catch {
        // nothing to tear down
      }
    }

    if (!payload.signedUrl) {
      startingRef.current = false;
      setError("Couldn't start the session. Try again in a moment.");
      setPhase("error");
      return;
    }

    try {
      await startSession({
        signedUrl: payload.signedUrl,
        connectionType: "websocket",
        dynamicVariables: payload.dynamicVariables,
      });
      // onConnect promotes us to "live".
    } catch (errWs) {
      console.error("[socrates-call] WebSocket fallback failed", errWs);
      startingRef.current = false;
      setError(
        isMicPermissionError(errWs)
          ? "Socrates needs your microphone. Allow access, then try again."
          : "Couldn't start the session. Try again in a moment.",
      );
      setPhase("error");
    }
  }, [phase, startSession, endSession]);

  const end = useCallback(async () => {
    startingRef.current = false;
    try {
      await endSession();
    } catch (err) {
      console.error("[socrates-call] endSession failed", err);
    }
    setPhase("ended");
  }, [endSession]);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  return {
    phase,
    starState: deriveStarState(phase, status, isSpeaking),
    isSpeaking,
    isMuted,
    lastMessage: messages[messages.length - 1] ?? null,
    messages,
    error,
    start,
    end,
    toggleMute,
  };
}

// Map our phase + the SDK signals to the BreathingStar's calm states.
function deriveStarState(
  phase: CallPhase,
  status: ReturnType<typeof useConversation>["status"],
  isSpeaking: boolean,
): StarState {
  if (phase === "ended" || phase === "error") return "ended";
  if (phase === "connecting" || status === "connecting") return "thinking";
  if (phase === "live" || status === "connected") {
    return isSpeaking ? "speaking" : "listening";
  }
  return "idle";
}

function isMicPermissionError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
      return true;
    }
    return /permission|denied|microphone|getusermedia|notallowed/i.test(
      err.message,
    );
  }
  return false;
}
