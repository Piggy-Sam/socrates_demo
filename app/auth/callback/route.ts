import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The email-OTP verification types Supabase sends on a magic-link landing.
type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

// Magic-link landing. Supabase sends either a PKCE `?code=` (exchange for a
// session) or a `?token_hash=&type=` pair (verifyOtp fallback). On success we
// redirect to `?next` (default /today); on failure to /login?error=auth.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // keep `next` relative-only so it can't be used as an open redirect
  const nextParam = searchParams.get("next") ?? "/today";
  const next = nextParam.startsWith("/") ? nextParam : "/today";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
