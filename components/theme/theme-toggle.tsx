"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "./theme-provider";

const ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const NEXT_LABEL: Record<ThemePref, string> = {
  light: "Switch to dark",
  dark: "Switch to system",
  system: "Switch to light",
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preference, cycle } = useTheme();
  const Icon = ICON[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={NEXT_LABEL[preference]}
      title={`Theme: ${preference}`}
      className={`group inline-flex size-9 items-center justify-center rounded-sm border border-hairline text-marble-dim transition-colors duration-300 hover:border-hairline-strong hover:text-gold ${className}`}
    >
      <Icon
        className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:rotate-12"
        strokeWidth={1.6}
      />
    </button>
  );
}
