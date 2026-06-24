// Transient "See demo" mode.
//
// A visitor who clicks "See demo" on the landing page gets a short-lived cookie
// that makes the server resolve their identity to the dedicated DEMO account's
// curated data for READS — so anyone can explore every surface, fully populated,
// with no sign-up. (This is a separate account from the owner's own, so the
// owner's personal testing never affects what judges see.) Every WRITE path checks isDemo and no-ops, so nothing a
// visitor does touches the real account. Clearing the cookie ("Exit demo", or it
// simply expiring) returns them to the landing page; because nothing persisted,
// a refresh shows the same pristine seeded state.
//
// Constants only (no next/headers) so this is safe to import from the proxy
// (middleware) as well as from server components / route handlers.

export const DEMO_COOKIE = "socrates_demo";

/** The dedicated account a demo session reads from — the curated demo persona,
 *  provisioned via `npm run provision-demo` (demo.pitch@socrates-ai.app). */
export const DEMO_USER_ID =
  process.env.DEMO_USER_ID || "2c4b25ff-009e-4748-8e06-fe2f9436709b";

/** How long a demo session lasts before it lapses back to the landing page. */
export const DEMO_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * The ONLY account allowed to place a real outbound "Call me now" — the owner,
 * whose phone is the only number a Twilio trial account can dial. Everyone else
 * (demo sessions and any other signed-in user) gets a friendly "no Twilio budget"
 * note and is pointed at the in-browser "Talk now" instead. Defaults to the
 * owner's real account (the receiver of every call, including the public
 * on-stage pitch call), kept env-overridable.
 */
export const CALLS_OWNER_USER_ID =
  process.env.CALLS_OWNER_USER_ID || "c996ad01-7f17-4c11-8c1d-d65baf4249e3";
