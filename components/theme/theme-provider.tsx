"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePref = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

const STORAGE_KEY = "socrates-theme";

type ThemeContext = {
  /** the user's stored preference */
  preference: ThemePref;
  /** the actually-applied appearance */
  resolved: Resolved;
  setPreference: (p: ThemePref) => void;
  /** cycle light → dark → system */
  cycle: () => void;
};

const Ctx = createContext<ThemeContext | null>(null);

function systemResolved(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(resolved: Resolved) {
  document.documentElement.dataset.theme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<Resolved>("dark");

  // hydrate from storage (the no-flash script already applied the DOM value)
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemePref) ?? "system";
    setPref(stored);
    setResolved(stored === "system" ? systemResolved() : stored);
  }, []);

  // follow the OS while preference is "system"
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = mq.matches ? "dark" : "light";
      setResolved(r);
      apply(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p: ThemePref) => {
    setPref(p);
    localStorage.setItem(STORAGE_KEY, p);
    const r = p === "system" ? systemResolved() : p;
    setResolved(r);
    apply(r);
  }, []);

  const cycle = useCallback(() => {
    setPreference(
      preference === "light"
        ? "dark"
        : preference === "dark"
          ? "system"
          : "light",
    );
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, cycle }),
    [preference, resolved, setPreference, cycle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
