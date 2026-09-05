"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { streamSSE } from "@/lib/client/sse";
import { initialLayeredState, layeredReducer, type LayeredState } from "@/lib/layered/reducer";
import type { L1Result, L2Result, L3Result, L4Result } from "@/lib/layered/types";

const STORAGE_KEY = "aries:layered-run";

interface SavedLayered {
  v: number;
  mint: string;
  token: L1Result["token"];
  symbol: string;
  reports: L1Result["reports"];
  debate: L2Result["debate"];
  risks: L3Result["risks"];
  decision: string;
  shareId: string;
  chains: { l1?: string; l2?: string; l3?: string };
}

type Step = NonNullable<LayeredState["failedStep"]>;

interface Seed {
  mint: string;
  wallet?: string;
  chain?: string;
  token?: L1Result["token"];
  symbol?: string;
  reports?: L1Result["reports"];
  debate?: L2Result["debate"];
  risks?: L3Result["risks"];
}

async function streamLayer(
  url: string,
  body: unknown,
  signal: AbortSignal,
  onEvent: (type: string, data: Record<string, unknown>) => void
): Promise<Record<string, unknown>> {
  let result: Record<string, unknown> | null = null;
  let failure: string | null = null;
  await streamSSE(url, body as Record<string, unknown>, (type, data) => {
    const d = data as Record<string, unknown>;
    if (type === "result") {
      if (typeof d.error === "string") failure = d.error;
      else result = (d.result ?? {}) as Record<string, unknown>;
      return;
    }
    if (type === "error" && typeof d.message === "string") {
      failure = d.message;
      return;
    }
    if (type === "done") return;
    onEvent(type, d);
  }, signal);
  if (failure) throw new Error(failure);
  if (!result) throw new Error("Stream ended without result");
  return result;
}

export function useLayeredAnalysis() {
  const [state, dispatch] = useReducer(layeredReducer, initialLayeredState);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const failRun = useCallback((step: Step, signal: AbortSignal, err: unknown) => {
    if (signal.aborted) return;
    dispatch({ type: "FAIL", step, message: err instanceof Error ? err.message : String(err) });
  }, []);

  const runFrom = useCallback(async (from: Step, seed: Seed, signal: AbortSignal) => {
    const mint = seed.mint;
    let { token, symbol, reports, debate, risks, chain } = seed;
    if (from === "l1") {
      let done = 0;
      const l1 = (await streamLayer("/api/l1", { mint }, signal, (type, d) => {
        if (type === "agent_report" && typeof d.agent === "string" && typeof d.report === "string") {
          done += 1;
          dispatch({ type: "NOTE", note: `L1 analysts ${done}/4 — ${d.agent} done` });
          if (d.agent === "onchain" || d.agent === "technical" || d.agent === "sentiment" || d.agent === "news") {
            dispatch({ type: "L1_REPORT", agent: d.agent, report: d.report });
          }
        } else if (type === "token_found" && typeof d.name === "string") {
          dispatch({ type: "NOTE", note: `Found ${d.name}, scouts running` });
          dispatch({
            type: "L1_TOKEN",
            token: { name: d.name, price: String(d.price ?? "?"), liquidity: Number(d.liquidity) || 0, change24h: Number(d.change24h) || 0 },
            symbol: typeof d.symbol === "string" ? d.symbol : "",
          });
        }
      })) as unknown as L1Result;
      token = l1.token;
      symbol = l1.symbol;
      reports = l1.reports;
      chain = l1.chain;
      if (!signal.aborted) dispatch({ type: "L1_OK", token, symbol, reports, chain, errors: l1.errors });
    }
    if (signal.aborted) return;
    if (from === "l1" || from === "l2") {
      if (!reports || !chain) throw new Error("Missing L1 reports");
      const l2 = (await streamLayer("/api/l2", { mint, reports, rounds: 2, chain }, signal, (type, d) => {
        if (type === "debate_turn" && typeof d.side === "string" && typeof d.text === "string") {
          dispatch({ type: "L2_TURN", turn: { phase: "invest", round: Number(d.round) || 0, side: d.side as "bull" | "bear", text: d.text } });
        }
      })) as unknown as L2Result;
      debate = l2.debate;
      chain = l2.chain;
      if (!signal.aborted) dispatch({ type: "L2_OK", debate, chain });
    }
    if (signal.aborted) return;
    if (from === "l1" || from === "l2" || from === "l3") {
      if (!reports || !debate || !chain) throw new Error("Missing prior layer data");
      let risksDone = 0;
      const l3 = (await streamLayer("/api/l3", { mint, reports, debate, chain }, signal, (type, d) => {
        if (type === "agent_report" && typeof d.agent === "string") {
          risksDone += 1;
          dispatch({ type: "NOTE", note: `L3 risk review ${risksDone}/3 — ${d.agent} done` });
        }
      })) as unknown as L3Result;
      risks = l3.risks;
      chain = l3.chain;
      if (!signal.aborted) dispatch({ type: "L3_OK", risks, chain });
    }
    if (signal.aborted) return;
    if (!token || !risks) throw new Error("Missing prior layer data");
    dispatch({ type: "NOTE", note: "L4 decider sealing verdict" });
    const l4 = (await streamLayer(
      "/api/l4",
      { mint, token, symbol: symbol ?? "", reports, debate, risks, chain, wallet: seed.wallet ?? null },
      signal,
      () => undefined
    )) as unknown as L4Result;
    if (!signal.aborted) dispatch({ type: "L4_OK", decision: l4.decision, shareId: l4.id });
  }, []);

  const start = useCallback(
    (mint: string, wallet?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "START", mint });
      void runFrom("l1", { mint, wallet }, controller.signal).catch((err) => {
        if (controller.signal.aborted) return;
        const s = stateRef.current;
        const step: Step = s.step === "l1" || s.step === "l2" || s.step === "l3" || s.step === "l4" ? s.step : "l1";
        failRun(step, controller.signal, err);
      });
    },
    [runFrom, failRun]
  );

  const retry = useCallback(() => {
    const s = stateRef.current;
    if (!s.failedStep || s.step !== "error") return;
    const controller = new AbortController();
    abortRef.current = controller;
    const step = s.failedStep;
    const seed: Seed = { mint: s.mint, chain: step === "l2" ? s.chains.l1 : step === "l3" ? s.chains.l2 : step === "l4" ? s.chains.l3 : undefined, token: s.token ?? undefined, symbol: s.symbol, reports: s.reports ?? undefined, debate: s.debate, risks: s.risks ?? undefined };
    dispatch({ type: "RETRY" });
    void runFrom(step, seed, controller.signal).catch((err) => failRun(step, controller.signal, err));
  }, [runFrom, failRun]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "RESET" });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // private mode / quota: ignore
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // One-time hydration from localStorage (external store).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SavedLayered;
      if (!s || s.v !== 2 || !s.decision) return;
      dispatch({ type: "START", mint: s.mint });
      dispatch({ type: "L1_OK", token: s.token, symbol: s.symbol, reports: s.reports, chain: s.chains?.l1 ?? "", errors: [] });
      dispatch({ type: "L2_OK", debate: s.debate, chain: s.chains?.l2 ?? "" });
      dispatch({ type: "L3_OK", risks: s.risks, chain: s.chains?.l3 ?? "" });
      dispatch({ type: "L4_OK", decision: s.decision, shareId: s.shareId });
    } catch {
      // corrupt save: ignore
    }
  }, []);

  useEffect(() => {
    if (state.step !== "done" || !state.decision || !state.token || !state.reports || !state.risks || !state.shareId) return;
    try {
      const saved: SavedLayered = {
        v: 2,
        mint: state.mint,
        token: state.token,
        symbol: state.symbol,
        reports: state.reports,
        debate: state.debate,
        risks: state.risks,
        decision: state.decision,
        shareId: state.shareId,
        chains: state.chains,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // private mode / quota: ignore
    }
  }, [state]);

  return { state, start, retry, reset };
}
