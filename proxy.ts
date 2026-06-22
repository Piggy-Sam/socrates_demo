import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 "proxy" convention (formerly middleware). Proxy ALWAYS runs on the
// Node.js runtime — which is exactly what we need: the Supabase SSR client pulls
// in @supabase/supabase-js -> realtime-js -> `ws`, a Node-only module the Edge
// bundler rejected ("Edge Function referencing unsupported modules"). No runtime
// config is allowed here (Next errors on it) since Node is implied.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // run on everything except static assets, images, and the LLM/webhook APIs
    // (those authenticate themselves via bearer/HMAC, not cookies)
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|api/llm|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
