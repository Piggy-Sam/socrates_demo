// "Call my phone" — the LIVE moment in the pitch deck (slide 8).
//
// This is the same outbound-call contract as /api/calls/trigger: POST with no
// body, reads the signed-in owner's profile server-side and places the call.
// We deliberately reuse that handler verbatim (single source of truth for the
// owner-only Twilio gate, opener generation, and the friendly "no budget"
// fallback) so the pitch path can never drift from the real product path.
//
// Contract:
//   POST /api/calls/pitch
//   -> 200 { ok: true, conversationId?, callSid? }
//   -> 200 { ok: false, blocked: true, error }   (not the owner / demo session)
//   -> 4xx/5xx { ok: false, error }               (no phone, place failed, …)

export { POST, runtime } from "../trigger/route";
