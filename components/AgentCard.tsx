"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export interface ToolBadge {
  tool: string;
  args: string;
}

interface AgentCardProps {
  agent: string;
  status: "running" | "done";
  reasoning: string;
  tools: ToolBadge[];
  report: string | null;
}

// Per-agent cumulative card: live reasoning buffer, tool badges, final report.
export default function AgentCard({ agent, status, reasoning, tools, report }: AgentCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [reasoning]);

  return (
    <section
      aria-label={`Agent ${agent}`}
      data-testid={`agent-card-${agent}`}
      className="rounded border border-zinc-800 bg-zinc-950 p-4"
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
              title={t.args}
              className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-300"
            >
              {t.tool}
              {t.args ? ` ${t.args.slice(0, 40)}` : ""}
            </span>
          ))}
        </div>
      )}

      {reasoning && (
        <details open className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500">Reasoning</summary>
          <div
            ref={scrollRef}
            data-testid={`agent-reasoning-${agent}`}
            className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm italic text-zinc-400"
          >
            {reasoning}
          </div>
        </details>
      )}

      {report && (
        <div data-testid={`agent-report-${agent}`} className="md mt-3 max-w-none">
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
