"use client";

import ReactMarkdown from "react-markdown";

interface DebateCardProps {
  phase: "invest" | "risk" | string;
  round: number;
  side: string;
  text: string;
}

function borderFor(side: string): string {
  const s = side.toLowerCase();
  if (s === "bull") return "border-[#22c55e]";
  if (s === "bear") return "border-[#ef4444]";
  return "border-zinc-700";
}

function titleFor(phase: string, round: number, side: string): string {
  const base = phase === "invest" ? "Bull vs Bear" : phase === "risk" ? "Risk Debate" : phase;
  return `${base} — Round ${round} (${side})`;
}

// One card per debate_turn, appended in arrival order.
export default function DebateCard({ phase, round, side, text }: DebateCardProps) {
  return (
    <section
      aria-label={titleFor(phase, round, side)}
      data-testid={`debate-card-${phase}-${round}-${side}`}
      className={`rounded border bg-zinc-950 p-4 ${borderFor(side)}`}
    >
      <h3 className="text-sm font-semibold">{titleFor(phase, round, side)}</h3>
      <div className="md mt-2 max-w-none">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </section>
  );
}
