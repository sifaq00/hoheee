"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseDecision } from "@/lib/decision";

function ratingColor(rating: string | null): string {
  if (!rating) return "text-zinc-300";
  const r = rating.toLowerCase();
  if (r.includes("buy") || r.includes("overweight")) return "text-[#22c55e]";
  if (r.includes("sell") || r.includes("underweight")) return "text-[#ef4444]";
  return "text-zinc-300";
}

// Sticky final decision card with collapsible details, so the full thesis
// never blocks the feed below. Renders raw markdown when headers missing.
export default function DecisionCard({ markdown }: { markdown: string }) {
  const parsed = parseDecision(markdown);
  const structured = parsed.rating !== null;
  const [expanded, setExpanded] = useState(true);
  return (
    <section
      aria-label="Final decision"
      data-testid="decision-card"
      className="sticky top-4 rounded border border-[#22c55e] bg-zinc-950 p-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="text-base font-bold">Final Decision</h2>
        {structured && (
          <p className="text-sm">
            <span data-testid="decision-rating" className={`font-mono font-semibold ${ratingColor(parsed.rating)}`}>
              {parsed.rating}
            </span>
            {parsed.confidence && (
              <span className="font-mono text-zinc-400"> · {parsed.confidence}</span>
            )}
          </p>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="ml-auto rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>
      {expanded && (
        <div className="thin-scroll max-h-[70vh] overflow-y-auto">
      {!structured ? (
        <div className="md mt-2 max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap gap-4">
            <p>
              <span className="text-zinc-500">Rating: </span>
              <span className={`font-mono font-semibold ${ratingColor(parsed.rating)}`}>
                {parsed.rating}
              </span>
            </p>
            {parsed.confidence && (
              <p>
                <span className="text-zinc-500">Confidence: </span>
                <span data-testid="decision-confidence" className="font-mono">
                  {parsed.confidence}
                </span>
              </p>
            )}
          </div>
          {parsed.risks.length > 0 && (
            <div>
              <h3 className="text-zinc-500">Key risks</h3>
              <ul className="mt-1 list-disc pl-5">
                {parsed.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.executiveSummary && (
            <div>
              <h3 className="text-zinc-500">Executive summary</h3>
              <div className="md mt-1 max-w-none">
                <ReactMarkdown>{parsed.executiveSummary}</ReactMarkdown>
              </div>
            </div>
          )}
          {parsed.thesis && (
            <div>
              <h3 className="text-zinc-500">Investment thesis</h3>
              <div className="md mt-1 max-w-none">
                <ReactMarkdown>{parsed.thesis}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </section>
  );
}
