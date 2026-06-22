import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // run on everything except static assets, images, and the LLM/webhook APIs
    // (those authenticate themselves via bearer/HMAC, not cookies)
    "/((?!_next/static|_next/image|favicon.ico|api/llm|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
