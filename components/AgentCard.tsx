"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export interface ToolBadge {
  tool: string;
  args: string;
}

interface AgentCardProps {
  agent: string;
  status: "running" | "done";
  tools: ToolBadge[];
  results: { tool: string; summary: string }[];
  report: string | null;
}

// Per-agent cumulative card: tool badges, final report (typewriter reveal).
// Raw reasoning stream is intentionally never rendered — while running the
// card shows a single "reasoning …" pulse instead.
const TYPEWRITE_STEP = 12;
const TYPEWRITE_MS = 16;

export default function AgentCard({ agent, status, tools, results, report }: AgentCardProps) {
  // Typewriter reveal: reset the counter during render when a new report
  // arrives (sanctioned render-phase adjustment, no setState-in-effect).
  const [typed, setTyped] = useState(0);
  const [typedFor, setTypedFor] = useState<string | null>(null);
  if (report !== typedFor) {
    setTypedFor(report);
    setTyped(0);
  }
  const done = report !== null && typedFor === report && typed >= report.length;

  useEffect(() => {
    if (report === null || typedFor !== report) return;
    const total = report.length;
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? total
      : TYPEWRITE_STEP;
    const timer = setInterval(() => {
      setTyped((prev) => {
        if (prev >= total) {
          clearInterval(timer);
          return prev;
        }
        return Math.min(prev + step, total);
      });
    }, TYPEWRITE_MS);
    return () => clearInterval(timer);
  }, [report, typedFor]);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && !done) el.scrollTop = el.scrollHeight;
  });

  return (
    <section
      aria-label={`Agent ${agent}`}
      data-testid={`agent-card-${agent}`}
      className="flex h-80 flex-col rounded border border-zinc-800 bg-zinc-950 p-4"
    >
      <div className="flex items-center gap-2">
        <span
          aria-label={status}
          data-testid={`agent-status-${agent}`}
          className={`inline-block h-2 w-2 rounded-full ${
            status === "running" ? "animate-pulse bg-[#22c55e]" : "bg-zinc-500"
          }`}
        />
        <h3 className="font-mono text-sm font-semibold">{agent}</h3>
      </div>

      {tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid={`agent-tools-${agent}`}>
          {tools.map((t, i) => (
            <span
              key={i}
              className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-300"
            >
              {t.tool}
            </span>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <ul className="mt-2 flex max-h-20 flex-col gap-1 overflow-y-auto">
          {results.map((r, i) => (
            <li
              key={i}
              title={r.summary}
              className="truncate font-mono text-xs text-zinc-500"
            >
              <span className="text-[#22c55e]">✓</span> {r.tool} → {r.summary}
            </li>
          ))}
        </ul>
      )}

      {status === "running" && report === null && (
        <p className="mt-2 font-mono text-xs text-zinc-500">
          <span className="animate-pulse">reasoning …</span>
        </p>
      )}

      {report !== null && (
        <div ref={bodyRef} data-testid={`agent-report-${agent}`} className="md mt-3 min-h-0 flex-1 overflow-y-auto max-w-none">
          {done ? (
            <ReactMarkdown>{report}</ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-zinc-300">
              {report.slice(0, typed)}
              <span className="animate-pulse text-[#22c55e]">▊</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
