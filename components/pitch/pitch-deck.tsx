"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DotMatrix } from "@/components/decor/dot-matrix";
import { SLIDES } from "./slides";

const COUNT = SLIDES.length; // 10

/**
 * The pitch-deck shell. Ten slides live on a single horizontal track; the active
 * one is shown by translating the track by -index*100%. CRITICAL: every slide is
 * always mounted (never conditionally rendered) so a "Print to PDF" lays all ten
 * out as pages — and so the deck is fully legible with JS disabled (the static
 * PDF contingency for the live demo). All interactivity here — keyboard, the
 * control bar, the ambient dot-matrix, the live-call slide — is NON-essential.
 */
export function PitchDeck() {
  const [index, setIndex] = useState(0);

  const go = useCallback((next: number) => {
    setIndex((prev) => {
      const clamped = Math.max(0, Math.min(COUNT - 1, next));
      return clamped === prev ? prev : clamped;
    });
  }, []);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Keyboard navigation (adapted from chat-sidebar's keydown effect): arrows /
  // space / page keys move between slides; Home/End jump to the ends. The
  // listener is cleaned up on unmount. Ignore key presses while focus is in an
  // interactive control so Space/arrows there behave normally.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
        case "Spacebar":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(COUNT - 1);
          break;
        default:
          break;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [next, prev, go]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      {/* The viewport clips the track to one slide on screen; in print it opens
          up and the track flows as stacked pages (see pitch.css). */}
      <div className="deck-viewport h-full w-full overflow-hidden">
        <div
          className="deck-track flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((Slide, i) => (
            <section
              key={i}
              aria-hidden={i !== index}
              className="deck-slide relative flex h-dvh w-screen shrink-0 items-center justify-center overflow-hidden"
            >
              {/* faint living field behind every slide */}
              <DotMatrix
                className="absolute inset-0 -z-10"
                intensity={0.5}
              />
              <div className="mx-auto flex w-full max-w-6xl flex-col px-8 sm:px-14 lg:px-20">
                {/* render only the active slide's interactive parts as "live";
                    all slides receive `active` so e.g. the orb on slide 8 only
                    animates its reactive states when on screen. */}
                <Slide active={i === index} />
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* CONTROL BAR — chrome, hidden in print. */}
      <div className="deck-chrome pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-6 pb-6 sm:px-10">
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous slide"
            className="inline-flex size-10 items-center justify-center rounded-sm border border-hairline-strong text-marble-dim transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === COUNT - 1}
            aria-label="Next slide"
            className="inline-flex size-10 items-center justify-center rounded-sm border border-hairline-strong text-marble-dim transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowRight className="size-4" strokeWidth={1.8} />
          </button>
          <span className="label-mono ml-2 tabular-nums text-marble-dim">
            {String(index + 1).padStart(2, "0")} / {COUNT}
          </span>
        </div>

        {/* dot indicators */}
        <div className="pointer-events-auto flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className="group inline-flex size-5 items-center justify-center"
            >
              <span
                className={`block size-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "scale-125 bg-accent"
                    : "bg-marble-dim/40 group-hover:bg-marble-dim"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* a quiet keyboard hint, top-right; chrome */}
      <p className="deck-chrome label-mono pointer-events-none absolute top-6 right-8 z-20 hidden text-marble-dim/70 sm:block">
        &rsaquo; ← → to navigate
      </p>
    </div>
  );
}
