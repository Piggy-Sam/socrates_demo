// Transient "See demo" mode.
//
// A visitor who clicks "See demo" on the landing page gets a short-lived cookie
// that makes the server resolve their identity to the DEMO account (Yancun's
// seeded data) for READS — so anyone can explore every surface, fully populated,
// with no sign-up. Every WRITE path checks isDemo and no-ops, so nothing a
// visitor does touches the real account. Clearing the cookie ("Exit demo", or it
// simply expiring) returns them to the landing page; because nothing persisted,
// a refresh shows the same pristine seeded state.
//
// Constants only (no next/headers) so this is safe to import from the proxy
// (middleware) as well as from server components / route handlers.

export const DEMO_COOKIE = "socrates_demo";

/** The account a demo session reads from — the seeded demo persona. */
export const DEMO_USER_ID =
  process.env.DEMO_USER_ID || "c996ad01-7f17-4c11-8c1d-d65baf4249e3";

/** How long a demo session lasts before it lapses back to the landing page. */
export const DEMO_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
