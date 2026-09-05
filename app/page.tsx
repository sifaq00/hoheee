"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { stripToolCallXml } from "@/lib/pipeline/orchestrator";
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
  results: { tool: string; summary: string }[];
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

export interface BootLine {
  id: number;
  t: number;
  text: string;
  tone: "ok" | "dim" | "bad";
}

export const STREAM_INTERRUPTED_MSG = "Stream interrupted — partial results below";
const RESTORED_MSG = "Showing previous run — refresh ended the stream, results may be partial";
const STORAGE_KEY = "hoheee:last-run";

interface SavedRun {
  v: number;
  mint: string;
  token: FoundToken | null;
  agentOrder: string[];
  agents: Record<string, AgentFeedState>;
  debates: DebateItem[];
  decision: string | null;
  feedErrors: FeedErrorItem[];
  boot: BootLine[];
  completed: boolean;
}

function readSaved(): SavedRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedRun;
    if (!s || s.v !== 1 || (!s.token && !s.decision && s.agentOrder.length === 0)) return null;
    return s;
  } catch {
    return null;
  }
}

let savedCache: SavedRun | null | undefined;
function getSaved(): SavedRun | null {
  if (savedCache === undefined) {
    try {
      savedCache = readSaved();
    } catch {
      savedCache = null;
    }
  }
  return savedCache;
}

// Owns the phase state machine plus the streaming feed. One AbortController
// per run; reasoning chunks append to the per-agent buffer.
export function useAnalysis() {
  const [phase, setPhase] = useState<AnalysisPhase>(() => (getSaved() ? "done" : "idle"));
  const [token, setToken] = useState<FoundToken | null>(() => getSaved()?.token ?? null);
  const [agentOrder, setAgentOrder] = useState<string[]>(() => getSaved()?.agentOrder ?? []);
  const [agents, setAgents] = useState<Record<string, AgentFeedState>>(() => getSaved()?.agents ?? {});
  const [debates, setDebates] = useState<DebateItem[]>(() => getSaved()?.debates ?? []);
  const [decision, setDecision] = useState<string | null>(() => getSaved()?.decision ?? null);
  const [feedErrors, setFeedErrors] = useState<FeedErrorItem[]>(() => getSaved()?.feedErrors ?? []);
  const [streamError, setStreamError] = useState<string | null>(() => {
    const s = getSaved();
    return s && !s.completed ? RESTORED_MSG : null;
  });
  const [runId, setRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const t0Ref = useRef(0);
  const mintRef = useRef(getSaved()?.mint ?? "");
  const lastSaveRef = useRef(0);
  const [boot, setBoot] = useState<BootLine[]>(() => getSaved()?.boot ?? []);

  const ensureAgent = useCallback((key: string) => {
    setAgentOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setAgents((prev) =>
      prev[key]
        ? prev
        : { ...prev, [key]: { agent: key, status: "running", reasoning: "", tools: [], results: [], report: null } }
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
    setBoot([]);
    setRunId(null);
    setPhase("idle");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // private mode / quota: ignore
    }
  }, []);

  const logBoot = useCallback((text: string, tone: BootLine["tone"] = "dim") => {
    const id = ++idRef.current;
    const t = (Date.now() - t0Ref.current) / 1000;
    setBoot((prev) => [...prev.slice(-39), { id, t, text, tone }]);
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
    setBoot([]);
    setRunId(null);
    setPhase("running");
    t0Ref.current = Date.now();
    mintRef.current = mint;
    logBoot(`run ${mint.slice(0, 8)} .... INITIATED`);

    const onEvent = (type: string, data: unknown) => {
      const e = data as AgentEvent;
      const kind = e?.type ?? type;
      switch (kind) {
        case "token_found": {
          const t = e as Extract<AgentEvent, { type: "token_found" }>;
          setToken({ name: t.name, price: t.price, liquidity: t.liquidity, change24h: t.change24h });
          logBoot(`uplink ${t.name} .... OK`, "ok");
          break;
        }
        case "agent_start": {
          const a = e as Extract<AgentEvent, { type: "agent_start" }>;
          ensureAgent(String(a.agent ?? "unknown"));
          logBoot(`scout:${String(a.agent ?? "unknown")} .... ENGAGED`);
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
          case "tool_result": {
            const r = e as Extract<AgentEvent, { type: "tool_result" }>;
            const key = String(r.agent ?? "unknown");
            ensureAgent(key);
            const summary = stripToolCallXml(String(r.summary ?? "")).slice(0, 140);
            setAgents((prev) => ({
              ...prev,
              [key]: {
                ...prev[key],
                agent: key,
                status: prev[key]?.status ?? "running",
                reasoning: prev[key]?.reasoning ?? "",
                tools: prev[key]?.tools ?? [],
                results: [...(prev[key]?.results ?? []), { tool: r.tool, summary }],
                report: prev[key]?.report ?? null,
              },
            }));
            break;
          }
        case "agent_report": {
          const r = e as Extract<AgentEvent, { type: "agent_report" }>;
          const key = String(r.agent ?? "unknown");
          ensureAgent(key);
          logBoot(`scout:${key} .... FILED`, "ok");
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
          logBoot(`clash:${d.side} r${d.round} .... LOGGED`);
          break;
        }
        case "decision": {
          const d = e as Extract<AgentEvent, { type: "decision" }>;
          setDecision(d.markdown);
          setPhase("done");
          logBoot("verdict .... SEALED", "ok");
          break;
        }
        case "error": {
          const er = e as unknown as { agent?: unknown; message?: unknown };
          const id = ++idRef.current;
          setFeedErrors((prev) => [...prev, { id, agent: String(er.agent ?? "unknown"), message: String(er.message ?? "Unknown error") }]);
          logBoot(`${String(er.agent ?? "unknown")} .... FAULT`, "bad");
          break;
        }
        case "done": {
          const d = e as Extract<AgentEvent, { type: "done" }>;
          setRunId(d.runId);
          setPhase("done");
          logBoot("stream .... CLOSED");
          break;
        }
          default:
            break;
        }
      };

      void streamSSE("/api/analyze", { mint }, onEvent, controller.signal).catch((err) => {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? `${STREAM_INTERRUPTED_MSG}: ${err.message}` : STREAM_INTERRUPTED_MSG;
        setStreamError(msg);
        logBoot("stream .... CUT", "bad");
      });
    },
    [ensureAgent, logBoot]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  // Persist the last run (reasoning buffers excluded) at most every 2s so a
  // refresh restores results. Cleared only by explicit reset (New analysis).
  useEffect(() => {
    const now = Date.now();
    if (now - lastSaveRef.current < 2000) return;
    lastSaveRef.current = now;
    try {
      const slim: Record<string, AgentFeedState> = {};
      for (const [k, a] of Object.entries(agents)) slim[k] = { ...a, reasoning: "" };
      const saved: SavedRun = {
        v: 1,
        mint: mintRef.current,
        token,
        agentOrder,
        agents: slim,
        debates,
        decision,
        feedErrors,
        boot: boot.slice(-40),
        completed: phase === "done" && decision !== null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // private mode / quota: ignore
    }
  });

  return { phase, token, agentOrder, agents, debates, decision, feedErrors, streamError, boot, runId, startAnalysis, reset };
}

type PreviewStatus = "none" | "loading" | "ok" | "not-found" | "error";

type RailState = "idle" | "active" | "done";

function RailStep({ label, sub, state }: { label: string; sub: string; state: RailState }) {
  const glyph = state === "done" ? "■" : state === "active" ? "▶" : "□";
  const color =
    state === "done" ? "text-[#22c55e]" : state === "active" ? "animate-pulse text-[#22c55e]" : "text-zinc-700";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`font-mono text-sm ${color}`}>{glyph}</span>
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-xs font-semibold tracking-wider text-zinc-300">{label}</span>
        <span className="truncate font-mono text-xs text-zinc-500">{sub}</span>
      </div>
    </div>
  );
}

function PhaseRail({
  token,
  agents,
  agentOrder,
  debates,
  decision,
  phase,
}: {
  token: FoundToken | null;
  agents: Record<string, AgentFeedState>;
  agentOrder: string[];
  debates: DebateItem[];
  decision: string | null;
  phase: AnalysisPhase;
}) {
  const filed = agentOrder.filter((k) => agents[k]?.status === "done").length;
  const running = phase === "running";
  const link: RailState = token ? "done" : running ? "active" : "idle";
  const scouts: RailState = filed === 4 ? "done" : agentOrder.length > 0 ? "active" : "idle";
  const clash: RailState = decision ? "done" : filed === 4 ? "active" : "idle";
  const verdict: RailState = decision ? "done" : debates.length > 0 ? "active" : "idle";
  return (
    <div
      aria-label="Pipeline phases"
      className="grid grid-cols-2 gap-3 rounded border border-zinc-800 bg-zinc-950 p-3 lg:grid-cols-4"
    >
      <RailStep label="LINK" sub={token?.name ?? "await uplink"} state={link} />
      <RailStep label="SCOUTS" sub={`${filed}/4 filed`} state={scouts} />
      <RailStep label="CLASH" sub={debates.length > 0 ? `${debates.length} turns logged` : "await scouts"} state={clash} />
      <RailStep label="VERDICT" sub={decision ? "sealed" : "await clash"} state={verdict} />
    </div>
  );
}

function BootLog({ lines, running }: { lines: BootLine[]; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);
  return (
    <section aria-label="Boot log" className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Boot log</h2>
      <div ref={ref} className="mt-2 h-56 overflow-y-auto font-mono text-xs leading-relaxed">
        {lines.map((l) => (
          <p
            key={l.id}
            className={l.tone === "ok" ? "text-[#22c55e]" : l.tone === "bad" ? "text-[#ef4444]" : "text-zinc-500"}
          >
            <span className="text-zinc-600">t+{l.t.toFixed(1)}s</span> {l.text}
          </p>
        ))}
        {running && (
          <p className="text-[#22c55e]">
            <span className="animate-pulse">▊</span>
          </p>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { phase, token, agentOrder, agents, debates, decision, feedErrors, streamError, boot, startAnalysis, reset } = useAnalysis();
  const [mint, setMint] = useState(() => getSaved()?.mint ?? "");
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState<TokenPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("none");
  const [previewError, setPreviewError] = useState("");
  const requestId = useRef(0);

  const trimmed = mint.trim();
  const valid = MINT_REGEX.test(trimmed);
  const showValidationError = touched && trimmed.length > 0 && !valid;

  const fetchPreview = useCallback(async (value: string): Promise<boolean> => {
    const id = ++requestId.current;
    setPreviewStatus("loading");
    setPreviewError("");
    try {
      const res = await fetch(`/api/tokens/${encodeURIComponent(value)}`);
      if (id !== requestId.current) return false;
      if (res.status === 404) {
        setPreview(null);
        setPreviewStatus("not-found");
        return false;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setPreview(null);
        setPreviewStatus("error");
        setPreviewError(data?.error ?? `Preview request failed: ${res.status}`);
        return false;
      }
      const data = (await res.json()) as TokenPreview;
      setPreview(data);
      setPreviewStatus("ok");
      return true;
    } catch (err) {
      if (id !== requestId.current) return false;
      setPreview(null);
      setPreviewStatus("error");
      setPreviewError(err instanceof Error ? err.message : String(err));
      return false;
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
  const [starting, setStarting] = useState(false);
  const canRun = valid && phase === "idle" && !starting;
  const showFeed = phase === "running" || phase === "done";

  // Single click starts: ensures a fresh preview first when needed, so the
  // button never eats the first click while preview is still loading.
  const handleStart = useCallback(() => {
    if (!valid || phase !== "idle") return;
    if (previewStatus === "ok" && preview) {
      startAnalysis(trimmed);
      return;
    }
    setStarting(true);
    void fetchPreview(trimmed).then((ok) => {
      setStarting(false);
      if (ok) startAnalysis(trimmed);
    });
  }, [valid, phase, previewStatus, preview, fetchPreview, trimmed, startAnalysis]);

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10">
      <main className="w-full max-w-none flex flex-col gap-6">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold tracking-tight">
            Hoheee <span className="text-[#22c55e]">—</span> Solana Token
            Research
          </h1>
          <p className="text-sm text-zinc-400">
            Research tool, not financial advice. Analysis takes under a minute.
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
              if (e.key === "Enter" && valid) handleStart();
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
            onClick={handleStart}
            className="rounded border border-[#22c55e] px-4 py-2 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
          >
            {starting ? "Loading preview…" : "Run analysis"}
          </button>
        )}

        </div>

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
            <PhaseRail
              token={token}
              agents={agents}
              agentOrder={agentOrder}
              debates={debates}
              decision={decision}
              phase={phase}
            />
            {phase === "done" && decision && <DecisionCard markdown={decision} />}
            <div className="grid items-start gap-4 xl:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
                {token && (
                  <TokenCard
                    name={token.name}
                    price={token.price}
                    liquidity={token.liquidity}
                    change24h={token.change24h}
                  />
                )}
                {agentOrder.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Analysts ({agentOrder.filter((k) => agents[k]?.status === "done").length}/{agentOrder.length})
                    </h2>
                    <div className="grid items-start gap-4 sm:grid-cols-2">
                      {agentOrder.map((key) => {
                        const a = agents[key];
                        if (!a) return null;
                        return (
                          <div key={key} className="min-w-0">
                            <AgentCard
                              agent={a.agent}
                              status={a.status}
                              tools={a.tools}
                              results={a.results}
                              report={a.report}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {debates.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Debate ({debates.length})
                    </h2>
                    <div className="grid items-start gap-4 md:grid-cols-2">
                      {debates.map((d) => (
                        <div key={d.id} className="min-w-0">
                          <DebateCard phase={d.phase} round={d.round} side={d.side} text={d.text} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
              <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4">
                <BootLog lines={boot} running={phase === "running"} />
              </aside>
            </div>
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
      <footer className="mt-6 w-full border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
          <p>
            Each flash run takes under a minute: mini analysts plus one debate
            round, no risk review.
            New tokens have thin data — low liquidity and short history make
            signals unreliable. This system can be wrong: output is automated
            research, not financial advice.
          </p>
          <p className="mt-2">
            Research background: &ldquo;TradingAgents: Multi-Agents LLM
            Financial Trading Framework&rdquo; (arXiv 2412.20138).
          </p>
      </footer>
    </div>
  );
}
