import { ImageResponse } from "next/og";

export const alt = "Socrates AI — An instrument for the examined life";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A clean lab-readout card: paper, ink, one blue, a dot-matrix motif.
export default function OpengraphImage() {
  // a small dot lattice in the corner (the motif)
  const dots = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const d = Math.hypot(r - 2, c - 2);
      dots.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            left: 60 + c * 26,
            top: 60 + r * 26,
            width: 14,
            height: 14,
            borderRadius: 14,
            background: "#0F62FE",
            opacity: Math.max(0.18, 1 - d / 3),
          }}
        />,
      );
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "#F4F6FA",
          padding: 80,
          position: "relative",
          fontFamily: "monospace",
        }}
      >
        {dots}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 30,
            letterSpacing: 6,
            color: "#5A6678",
            textTransform: "uppercase",
          }}
        >
          Socrates AI
          <div
            style={{
              width: 16,
              height: 30,
              background: "#0F62FE",
              marginLeft: 10,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            lineHeight: 1.05,
            color: "#0B0F1A",
            marginTop: 24,
            maxWidth: 900,
            letterSpacing: -1,
          }}
        >
          An instrument for the examined life.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#5A6678",
            marginTop: 24,
            maxWidth: 820,
          }}
        >
          It doesn&apos;t hand you answers — it sharpens your own.
        </div>
      </div>
    ),
    { ...size },
  );
}
