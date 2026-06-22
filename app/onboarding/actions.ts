"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

/** Normalize a phone number to a basic E.164 form (+ followed by digits). */
function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  // keep an explicit leading +; otherwise assume the digits already carry the
  // country code (the demo dials a single Twilio-verified number)
  return `+${hadPlus ? digits : digits}`;
}

const ProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Please tell me what to call you.")
    .max(80),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  dailyCallTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 08:30."),
  phoneE164: z
    .string()
    .trim()
    .transform((v) => toE164(v))
    .refine((v): v is string => v !== null, "That phone number looks off."),
});

export type OnboardingState = {
  error?: string;
};

export async function upsertProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = ProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    dailyCallTime: formData.get("dailyCallTime"),
    phoneE164: formData.get("phoneE164"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something's off." };
  }

  const { displayName, timezone, dailyCallTime, phoneE164 } = parsed.data;

  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName,
      timezone,
      dailyCallTime,
      phoneE164,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { displayName, timezone, dailyCallTime, phoneE164 },
    });

  redirect("/today");
}
