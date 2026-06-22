import type { SkyStar } from "@/lib/constellation";

// Demo sky for the landing hero + design lab. Real banks come from the pipeline.
export const SAMPLE_SKY: SkyStar[] = [
  { id: "s-01", type: "idea", content: "What if the daily call opened on a live thread instead of asking how my day was?", themes: ["the product", "attention"], brightness: 0.9 },
  { id: "s-02", type: "question", content: "Why do I keep returning to the same decision without ever closing it?", themes: ["indecision", "metacognition"], brightness: 0.7 },
  { id: "s-03", type: "feeling", content: "A quiet dread before deep work that lifts the moment I actually start.", themes: ["attention", "work"], brightness: 0.5 },
  { id: "s-04", type: "observation", content: "I think more clearly walking than sitting. The motion does something.", themes: ["attention"], brightness: 0.45 },
  { id: "s-05", type: "decision", content: "Ship the on-demand voice before the scheduled call — it's the reliable spine.", themes: ["the product"], brightness: 0.8 },
  { id: "s-06", type: "opinion", content: "Most productivity advice is a way of avoiding the one hard thing.", themes: ["work", "indecision"], brightness: 0.6 },
  { id: "s-07", type: "idea", content: "The bank should read like a commonplace book, not a feed.", themes: ["the product"], brightness: 0.75 },
  { id: "s-08", type: "feeling", content: "Relief, naming a thing I'd been circling for weeks.", themes: ["metacognition"], brightness: 0.4 },
  { id: "s-09", type: "question", content: "Is solitude the input or the output of good thinking?", themes: ["attention", "metacognition"], brightness: 0.55 },
  { id: "s-10", type: "observation", content: "My best ideas arrive when I've stopped trying to have them.", themes: ["attention"], brightness: 0.5 },
  { id: "s-11", type: "idea", content: "Surface the contradiction gently — let me supply the meaning.", themes: ["the product", "metacognition"], brightness: 0.65 },
  { id: "s-12", type: "decision", content: "Stop re-deciding the framework. Commit for a month, then review.", themes: ["indecision", "work"], brightness: 0.7 },
  { id: "s-13", type: "feeling", content: "Curiosity, not pressure — that's the whole posture I want.", themes: ["the product"], brightness: 0.45 },
  { id: "s-14", type: "observation", content: "I argue better when I have to say it out loud first.", themes: ["metacognition"], brightness: 0.5 },
  { id: "s-15", type: "question", content: "What am I protecting when I avoid the concrete example?", themes: ["work"], brightness: 0.4 },
];
