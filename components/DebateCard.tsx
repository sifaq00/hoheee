"use client";

import ReactMarkdown from "react-markdown";

interface DebateCardProps {
  phase: "invest" | "risk" | string;
  round: number;
  side: string;
  text: string;
}

function titleFor(phase: string, round: number, side: string): string {
  const base = phase === "invest" ? "Bull vs Bear" : phase === "risk" ? "Risk Debate" : phase;
  return `${base} — Round ${round} (${side})`;
}

// One card per debate_turn: rendered as a debate floor — bull argues from
// the right (green), bear from the left (red), others centered neutral.
export default function DebateCard({ phase, round, side, text }: DebateCardProps) {
  const s = side.toLowerCase();
  const align =
    s === "bull" ? "justify-end" : s === "bear" ? "justify-start" : "justify-center";
  const bubble =
    s === "bull"
      ? "border-[#22c55e]/40 bg-[#22c55e]/5"
      : s === "bear"
        ? "border-[#ef4444]/40 bg-[#ef4444]/5"
        : "border-zinc-700 bg-zinc-950";
  return (
    <div className={`flex ${align}`} data-testid={`debate-card-${phase}-${round}-${side}`}>
      <section
        aria-label={titleFor(phase, round, side)}
        className={`w-full max-w-3xl rounded border p-4 ${bubble}`}
      >
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {titleFor(phase, round, side)}
        </h3>
        <div className="md mt-2 max-w-none">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
