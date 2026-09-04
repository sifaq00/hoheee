"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { streamSSE } from "@/lib/client/sse";
import { fmtNum } from "@/lib/client/format";
import TokenCard from "@/components/TokenCard";
import AgentCard, { type ToolBadge } from "@/components/AgentCard";
import DebateCard from "@/components/DebateCard";
import DecisionCard from "@/components/DecisionCard";

export type AnalysisPhase = "idle" | "running" | "done";

export const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Mirrors GET /api/tokens/[mint] success shape: { mint, summary }.
export interface TokenPreview {
  mint: string;
  summary: TokenSummary;
}

interface PreviewFields {
  name: string;
  symbol: string;
  price: string;
  liquidity: string;
  change24h: number | null;
  changeRaw: string;
}

// The preview API returns a structured summary; map it to card fields.
function previewFields(summary: TokenSummary): PreviewFields {
  return {
    name: summary.name,
    symbol: summary.symbol,
    price: summary.priceUsd,
    liquidity: fmtNum(summary.liquidityUsd),
    change24h: summary.priceChange24h,
    changeRaw: `${summary.priceChange24h}%`,
  };
}

export interface AgentFeedState {
  agent: string;
  status: "running" | "done";
  reasoning: string;
  tools: ToolBadge[];
  report: string | null;
}

export interface DebateItem {
  id: number;
  phase: string;
  round: number;
  side: string;
  text: string;
}

export interface FeedErrorItem {
  id: number;
  agent: string;
  message: string;
}

export interface FoundToken {
  name: string;
  price: string;
  liquidity: number;
  change24h: number;
}

export const STREAM_INTERRUPTED_MSG = "Stream interrupted — partial results below";

// Owns the phase state machine plus the streaming feed. One AbortController
// per run; reasoning chunks append to the per-agent buffer.
export function useAnalysis() {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [token, setToken] = useState<FoundToken | null>(null);
  const [agentOrder, setAgentOrder] = useState<string[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentFeedState>>({});
  const [debates, setDebates] = useState<DebateItem[]>([]);
  const [decision, setDecision] = useState<string | null>(null);
  const [feedErrors, setFeedErrors] = useState<FeedErrorItem[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);

  const ensureAgent = useCallback((key: string) => {
    setAgentOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setAgents((prev) =>
      prev[key]
        ? prev
        : { ...prev, [key]: { agent: key, status: "running", reasoning: "", tools: [], report: null } }
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setToken(null);
    setAgentOrder([]);
    setAgents({});
    setDebates([]);
    setDecision(null);
    setFeedErrors([]);
    setStreamError(null);
    setRunId(null);
    setPhase("idle");
  }, []);

  const startAnalysis = useCallback(
    (mint: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      idRef.current = 0;
      setToken(null);
      setAgentOrder([]);
      setAgents({});
      setDebates([]);
      setDecision(null);
      setFeedErrors([]);
      setStreamError(null);
      setRunId(null);
      setPhase("running");

      const onEvent = (type: string, data: unknown) => {
        const e = data as AgentEvent;
        const kind = e?.type ?? type;
        switch (kind) {
          case "token_found": {
            const t = e as Extract<AgentEvent, { type: "token_found" }>;
            setToken({ name: t.name, price: t.price, liquidity: t.liquidity, change24h: t.change24h });
            break;
          }
          case "agent_start": {
            const a = e as Extract<AgentEvent, { type: "agent_start" }>;
            ensureAgent(String(a.agent ?? "unknown"));
            break;
          }
          case "reasoning": {
            const r = e as Extract<AgentEvent, { type: "reasoning" }>;
            const key = String(r.agent ?? "unknown");
            ensureAgent(key);
            setAgents((prev) => ({
              ...prev,
              [key]: { ...prev[key], agent: key, status: prev[key]?.status ?? "running", reasoning: (prev[key]?.reasoning ?? "") + (r.text ?? ""), tools: prev[key]?.tools ?? [], report: prev[key]?.report ?? null },
            }));
            break;
          }
          case "tool_call": {
            const t = e as Extract<AgentEvent, { type: "tool_call" }>;
            const key = String(t.agent ?? "unknown");
            ensureAgent(key);
            setAgents((prev) => ({
              ...prev,
              [key]: { ...prev[key], agent: key, status: prev[key]?.status ?? "running", reasoning: prev[key]?.reasoning ?? "", tools: [...(prev[key]?.tools ?? []), { tool: t.tool, args: t.args ?? "" }], report: prev[key]?.report ?? null },
            }));
            break;
          }
          case "tool_result":
            break;
          case "agent_report": {
            const r = e as Extract<AgentEvent, { type: "agent_report" }>;
            const key = String(r.agent ?? "unknown");
            ensureAgent(key);
            setAgents((prev) => ({
              ...prev,
              [key]: { ...prev[key], agent: key, status: "done", reasoning: prev[key]?.reasoning ?? "", tools: prev[key]?.tools ?? [], report: r.report },
            }));
            break;
          }
          case "debate_turn": {
            const d = e as Extract<AgentEvent, { type: "debate_turn" }>;
            const id = ++idRef.current;
            setDebates((prev) => [...prev, { id, phase: d.phase, round: d.round, side: d.side, text: d.text }]);
            break;
          }
          case "decision": {
            const d = e as Extract<AgentEvent, { type: "decision" }>;
            setDecision(d.markdown);
            setPhase("done");
            break;
          }
          case "error": {
            const er = e as unknown as { agent?: unknown; message?: unknown };
            const id = ++idRef.current;
            setFeedErrors((prev) => [...prev, { id, agent: String(er.agent ?? "unknown"), message: String(er.message ?? "Unknown error") }]);
            break;
          }
          case "done": {
            const d = e as Extract<AgentEvent, { type: "done" }>;
            setRunId(d.runId);
            setPhase("done");
            break;
          }
          default:
            break;
        }
      };

      void streamSSE("/api/analyze", { mint }, onEvent, controller.signal).catch((err) => {
        if (controller.signal.aborted) return;
        setStreamError(err instanceof Error ? `${STREAM_INTERRUPTED_MSG}: ${err.message}` : STREAM_INTERRUPTED_MSG);
      });
    },
    [ensureAgent]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { phase, token, agentOrder, agents, debates, decision, feedErrors, streamError, runId, startAnalysis, reset };
}

type PreviewStatus = "none" | "loading" | "ok" | "not-found" | "error";

export default function Home() {
  const { phase, token, agentOrder, agents, debates, decision, feedErrors, streamError, startAnalysis, reset } = useAnalysis();
  const [mint, setMint] = useState("");
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState<TokenPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("none");
  const [previewError, setPreviewError] = useState("");
  const requestId = useRef(0);

  const trimmed = mint.trim();
  const valid = MINT_REGEX.test(trimmed);
  const showValidationError = touched && trimmed.length > 0 && !valid;

  const fetchPreview = useCallback(async (value: string) => {
    const id = ++requestId.current;
    setPreviewStatus("loading");
    setPreviewError("");
    try {
      const res = await fetch(`/api/tokens/${encodeURIComponent(value)}`);
      if (id !== requestId.current) return;
      if (res.status === 404) {
        setPreview(null);
        setPreviewStatus("not-found");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setPreview(null);
        setPreviewStatus("error");
        setPreviewError(data?.error ?? `Preview request failed: ${res.status}`);
        return;
      }
      const data = (await res.json()) as TokenPreview;
      setPreview(data);
      setPreviewStatus("ok");
    } catch (err) {
      if (id !== requestId.current) return;
      setPreview(null);
      setPreviewStatus("error");
      setPreviewError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Auto-fetch preview once the mint validates (debounced).
  useEffect(() => {
    if (!valid || phase !== "idle") return;
    const timer = setTimeout(() => {
      void fetchPreview(trimmed);
    }, 500);
    return () => clearTimeout(timer);
  }, [trimmed, valid, phase, fetchPreview]);

  const fields = preview ? previewFields(preview.summary) : null;
  const changePositive = (fields?.change24h ?? 0) >= 0;
  const canRun = valid && previewStatus === "ok" && phase === "idle";
  const showFeed = phase === "running" || phase === "done";

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10">
      <main className="w-full max-w-2xl flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold tracking-tight">
            Hoheee <span className="text-[#22c55e]">—</span> Solana Token
            Research
          </h1>
          <p className="text-sm text-zinc-400">
            Research tool, not financial advice. Analysis takes 5-15 minutes.
          </p>
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
            disabled={phase === "running"}
            onChange={(e) => {
              setMint(e.target.value);
              setTouched(true);
              setPreviewStatus("none");
              setPreview(null);
              setPreviewError("");
            }}
            onBlur={() => {
              if (valid) void fetchPreview(trimmed);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) void fetchPreview(trimmed);
            }}
            className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-[#e5e5e5] placeholder:text-zinc-600 focus:border-[#22c55e] focus:outline-none disabled:opacity-50"
          />
          {showValidationError && (
            <p role="alert" className="text-sm text-[#ef4444]">
              Invalid mint address: expected 32-44 base58 characters.
            </p>
          )}
          {previewStatus === "loading" && (
            <p className="text-sm text-zinc-400">Loading token preview…</p>
          )}
          {previewStatus === "not-found" && (
            <p role="alert" className="text-sm text-[#ef4444]">
              Token not found on DexScreener
            </p>
          )}
          {previewStatus === "error" && (
            <p role="alert" className="text-sm text-[#ef4444]">
              {previewError}
            </p>
          )}
        </section>

        {preview && fields && previewStatus === "ok" && phase === "idle" && (
          <section
            aria-label="Token preview"
            className="rounded border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">
                {fields.name}{" "}
                <span className="text-zinc-400">({fields.symbol})</span>
              </h2>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Price</dt>
                <dd className="font-mono">${fields.price}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Liquidity USD</dt>
                <dd className="font-mono">${fields.liquidity}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">24h change</dt>
                <dd
                  className={`font-mono ${changePositive ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                >
                  {fields.changeRaw}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {phase === "idle" && (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => startAnalysis(trimmed)}
            className="rounded border border-[#22c55e] px-4 py-2 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
          >
            Run analysis
          </button>
        )}

        {showFeed && (
          <div className="flex flex-col gap-4" data-testid="analysis-feed">
            {streamError && (
              <p role="alert" data-testid="stream-error" className="rounded border border-[#ef4444] p-3 text-sm text-[#ef4444]">
                {streamError}
              </p>
            )}
            {feedErrors.map((e) => (
              <p key={e.id} role="alert" data-testid={`feed-error-${e.id}`} className="rounded border border-[#ef4444] p-3 text-sm text-[#ef4444]">
                {e.agent}: {e.message}
              </p>
            ))}
            {phase === "done" && decision && <DecisionCard markdown={decision} />}
            {token && (
              <TokenCard
                name={token.name}
                price={token.price}
                liquidity={token.liquidity}
                change24h={token.change24h}
              />
            )}
            {agentOrder.map((key) => {
              const a = agents[key];
              if (!a) return null;
              return (
                <AgentCard
                  key={key}
                  agent={a.agent}
                  status={a.status}
                  reasoning={a.reasoning}
                  tools={a.tools}
                  report={a.report}
                />
              );
            })}
            {debates.map((d) => (
              <DebateCard key={d.id} phase={d.phase} round={d.round} side={d.side} text={d.text} />
            ))}
            {phase === "done" ? (
              <button
                type="button"
                onClick={reset}
                className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                New analysis
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#ef4444] hover:text-[#ef4444]"
              >
                Cancel analysis
              </button>
            )}
          </div>
        )}
      </main>
      <footer className="mt-6 w-full max-w-2xl border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
          <p>
            Each analysis takes about 13-20 minutes and consumes significant
            reasoning-model tokens across analysts, debates, and risk review.
            New tokens have thin data — low liquidity and short history make
            signals unreliable. This system can be wrong: output is automated
            research, not financial advice.
          </p>
          <p className="mt-2">Research background: arXiv 2412.20138.</p>
      </footer>
    </div>
  );
}
