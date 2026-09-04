"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isRunId } from "@/lib/progress/ids";
import type { AgentEvent } from "@/lib/pipeline/state";
import type { ToolBadge } from "@/components/AgentCard";
import { MINT_REGEX } from "@/app/page";
import { mergePage, type EventPage } from "@/lib/client/live-merge";
import TokenCard from "@/components/TokenCard";
import AgentCard from "@/components/AgentCard";
import DebateCard from "@/components/DebateCard";
import DecisionCard from "@/components/DecisionCard";

type JobStatus = "idle" | "queued" | "running" | "done" | "failed";

interface TokenView {
  name: string;
  price: string;
  liquidity: number;
  change24h: number;
}

interface AgentView {
  agent: string;
  status: "running" | "done";
  reasoning: string;
  tools: ToolBadge[];
  report: string | null;
}

interface DebateView {
  id: number;
  phase: string;
  round: number;
  side: string;
  text: string;
}

const POLL_MS = 5000;
const TIMEOUT_MS = 60 * 60 * 1000;
const TIMEOUT_MSG = "Job timed out, check the Actions tab";

// Full re-aggregation per poll (demo scale) — mirrors useAnalysis event
// reducer in app/page.tsx without touching that file.
function aggregate(events: unknown[]): {
  token: TokenView | null;
  agents: Record<string, AgentView>;
  order: string[];
  debates: DebateView[];
  decision: string | null;
} {
  let token: TokenView | null = null;
  const agents: Record<string, AgentView> = {};
  const order: string[] = [];
  const debates: DebateView[] = [];
  let decision: string | null = null;
  const ensure = (key: string) => {
    if (!agents[key]) {
      agents[key] = { agent: key, status: "running", reasoning: "", tools: [], report: null };
      order.push(key);
    }
  };
  events.forEach((raw, i) => {
    const e = raw as AgentEvent;
    switch (e?.type) {
      case "token_found":
        token = { name: e.name, price: e.price, liquidity: e.liquidity, change24h: e.change24h };
        break;
      case "agent_start":
        ensure(String(e.agent ?? "unknown"));
        break;
      case "reasoning": {
        const key = String(e.agent ?? "unknown");
        ensure(key);
        agents[key].reasoning += e.text ?? "";
        break;
      }
      case "tool_call": {
        const key = String(e.agent ?? "unknown");
        ensure(key);
        agents[key].tools.push({ tool: e.tool, args: e.args ?? "" });
        break;
      }
      case "agent_report": {
        const key = String(e.agent ?? "unknown");
        ensure(key);
        agents[key].status = "done";
        agents[key].report = e.report;
        break;
      }
      case "debate_turn":
        debates.push({ id: i, phase: e.phase, round: e.round, side: e.side, text: e.text });
        break;
      case "decision":
        decision = e.markdown;
        break;
      default:
        break;
    }
  });
  return { token, agents, order, debates, decision };
}

function LiveJob() {
  const [mint, setMint] = useState("");
  const [touched, setTouched] = useState(false);
  const [feed, setFeed] = useState<EventPage>({ events: [], cursor: 0 });
  const cursorRef = useRef(0);
  const stagnantRef = useRef(0);
  const startedAtRef = useRef(0);
  const params = useSearchParams();
  // Attach to an existing job, e.g. /live?runId=<uuid> — derived during
  // render (no setState-in-effect).
  const urlId = params.get("runId");
  const [runId, setRunId] = useState<string | null>(() =>
    urlId && isRunId(urlId) ? urlId : null
  );
  const [status, setStatus] = useState<JobStatus>(() =>
    urlId && isRunId(urlId) ? "running" : "idle"
  );
  const [error, setError] = useState<string | null>(() =>
    urlId && !isRunId(urlId) ? "Invalid runId in URL" : null
  );

  const trimmed = mint.trim();
  const valid = MINT_REGEX.test(trimmed);
  const showValidationError = touched && trimmed.length > 0 && !valid;
  const busy = status === "queued" || status === "running";

  const view = useMemo(() => aggregate(feed.events), [feed.events]);

  const reset = () => {
    setRunId(null);
    setFeed({ events: [], cursor: 0 });
    setStatus("idle");
    setError(null);
    cursorRef.current = 0;
    stagnantRef.current = 0;
  };

  const start = async () => {
    if (!valid || busy) return;
    setError(null);
    setFeed({ events: [], cursor: 0 });
    cursorRef.current = 0;
    stagnantRef.current = 0;
    setStatus("queued");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as { runId?: string; error?: string } | null;
      if (!res.ok || !data?.runId) {
        setStatus("idle");
        setError(data?.error ?? `Job request failed: ${res.status}`);
        return;
      }
      startedAtRef.current = Date.now();
      setRunId(data.runId);
      setStatus("running");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (!runId) return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    let stopped = false;
    const timer = setInterval(() => {
      void (async () => {
        if (stopped) return;
        if (Date.now() - startedAtRef.current > TIMEOUT_MS) {
          setError(TIMEOUT_MSG);
          setStatus("failed");
          clearInterval(timer);
          return;
        }
        try {
          const res = await fetch(`/api/jobs/${runId}/events?cursor=${cursorRef.current}`, { cache: "no-store" });
          const data = (await res.json().catch(() => null)) as {
            events?: unknown[];
            cursor?: number;
            status?: string;
            error?: string;
          } | null;
          if (stopped) return;
          if (!res.ok || !data || !Array.isArray(data.events) || typeof data.cursor !== "number") {
            setError(data?.error ?? `Events request failed: ${res.status}`);
            return;
          }
          setError(null);
          if (data.cursor === cursorRef.current) {
            stagnantRef.current += 1;
          } else {
            stagnantRef.current = 0;
            setFeed((prev) => mergePage(prev, { events: data.events as unknown[], cursor: data.cursor as number }));
            cursorRef.current = data.cursor;
          }
          const s = data.status === "done" || data.status === "failed" ? data.status : "running";
          setStatus(s);
          if ((s === "done" || s === "failed") && stagnantRef.current >= 2) clearInterval(timer);
        } catch (err) {
          if (!stopped) setError(err instanceof Error ? err.message : String(err));
        }
      })();
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [runId]);

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10">
      <main className="w-full max-w-7xl flex flex-col gap-6">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold tracking-tight">
            Hoheee <span className="text-[#22c55e]">—</span> Live Job
          </h1>
          <p className="text-sm text-zinc-400">Research tool, not financial advice. Polls progress every 5 seconds.</p>
        </header>

        <section className="flex flex-col gap-3">
          <label htmlFor="mint" className="text-sm text-zinc-400">
            Token mint address
          </label>
          <input
            id="mint"
            type="text"
            spellCheck={false}
            autoComplete="off"
            placeholder="Enter Solana mint address"
            value={mint}
            disabled={busy}
            onChange={(e) => {
              setMint(e.target.value);
              setTouched(true);
            }}
            className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-[#e5e5e5] placeholder:text-zinc-600 focus:border-[#22c55e] focus:outline-none disabled:opacity-50"
          />
          {showValidationError && (
            <p role="alert" className="text-sm text-[#ef4444]">
              Invalid mint address: expected 32-44 base58 characters.
            </p>
          )}
        </section>

        {status === "idle" ? (
          <button
            type="button"
            disabled={!valid}
            onClick={() => void start()}
            className="rounded border border-[#22c55e] px-4 py-2 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
          >
            Start job
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#ef4444] hover:text-[#ef4444]"
          >
            {busy ? "Cancel" : "New job"}
          </button>
        )}

        {runId && (
          <p className="text-sm text-zinc-400">
            runId:{" "}
            <Link href={`/r/${runId}`} className="font-mono text-[#22c55e] hover:underline">
              /r/{runId}
            </Link>{" "}
            <span className="text-zinc-500">(live ~1-2 min after rebuild)</span>
          </p>
        )}

        </div>

        <div className="flex flex-col gap-6" data-testid="live-feed">
          {error && (
            <p role="alert" className="rounded border border-[#ef4444] p-3 text-sm text-[#ef4444]">
              {error}
            </p>
          )}
          {busy && <p className="text-sm text-zinc-400">Polling… status: {status}</p>}
          {view.decision && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Final decision</h2>
              <DecisionCard markdown={view.decision} />
            </section>
          )}
          {view.token && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Token</h2>
              <TokenCard
                name={view.token.name}
                price={view.token.price}
                liquidity={view.token.liquidity}
                change24h={view.token.change24h}
              />
            </section>
          )}
          {view.order.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Analysts ({view.order.length})
              </h2>
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {view.order.map((key) => {
                  const a = view.agents[key];
                  if (!a) return null;
                  return (
                    <div key={key} className="min-w-0">
                      <AgentCard agent={a.agent} status={a.status} reasoning={a.reasoning} tools={a.tools} report={a.report} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {view.debates.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Debate ({view.debates.length})
              </h2>
              <div className="grid items-start gap-4 lg:grid-cols-2">
                {view.debates.map((d) => (
                  <div key={d.id} className="min-w-0">
                    <DebateCard phase={d.phase} round={d.round} side={d.side} text={d.text} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <footer className="mt-6 w-full max-w-2xl border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
        <p>
          Live jobs run on GitHub Actions and poll every 5 seconds. Each analysis takes about 13-20 minutes. This system
          can be wrong: output is automated research, not financial advice.
        </p>
      </footer>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense>
      <LiveJob />
    </Suspense>
  );
}
