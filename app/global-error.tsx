"use client";

// Last-resort boundary for failures in the ROOT layout itself (font loading,
// theme provider, the html/body shell). When this fires, Next replaces the whole
// document — our root layout, globals.css and design tokens are all bypassed — so
// this fallback is fully self-contained: it renders its own <html>/<body> and
// inlines the instrument's palette (hairline rules, mono caption, one accent),
// honouring the system colour scheme. Kept deliberately minimal and calm.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const mono =
    "ui-monospace, 'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
  const sans =
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
        <style>{`
          :root{--ink:#f4f6fa;--marble:#0b0f1a;--marble-dim:#5a6678;--hairline:#d7dee8;--accent:#0f62fe}
          @media (prefers-color-scheme:dark){
            :root{--ink:#0b1220;--marble:#e8edf5;--marble-dim:#8a97ad;--hairline:#2a3a57;--accent:#4d7cff}
          }
          *{box-sizing:border-box}
          body{margin:0}
        `}</style>
      </head>
      <body
        style={{
          background: "var(--ink)",
          color: "var(--marble)",
          fontFamily: sans,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <main
          role="alert"
          style={{
            margin: "0 auto",
            width: "100%",
            maxWidth: "36rem",
            padding: "0 1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: mono,
              fontSize: "0.6875rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--marble-dim)",
              margin: "0 0 1.5rem",
            }}
          >
            &rsaquo; the instrument went quiet
          </p>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 300,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Something interrupted the examination.
          </h1>
          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--marble-dim)",
            }}
          >
            The fault is mine, not yours. Begin again, and we&rsquo;ll resume the
            inquiry where we left it.
          </p>
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "2.5rem",
                padding: "0 1.25rem",
                borderRadius: "0.125rem",
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontFamily: sans,
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {error.digest ? (
              <span
                style={{
                  fontFamily: mono,
                  fontSize: "0.6875rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--marble-dim)",
                }}
              >
                ref&nbsp;{error.digest}
              </span>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
