"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialLayeredState, layeredReducer, type LayeredState } from "@/lib/layered/reducer";
import type { L1Result, L2Result, L3Result, L4Result } from "@/lib/layered/types";

const STORAGE_KEY = "hoheee:layered-run";

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
}

type Step = NonNullable<LayeredState["failedStep"]>;

interface Seed {
  mint: string;
  token?: L1Result["token"];
  symbol?: string;
  reports?: L1Result["reports"];
  debate?: L2Result["debate"];
  risks?: L3Result["risks"];
}

async function postJson(url: string, body: unknown, signal: AbortSignal): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | Record<string, unknown> | null;
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `Request failed: ${res.status}`);
  return (data ?? {}) as Record<string, unknown>;
}

export function useLayeredAnalysis() {
  const [state, dispatch] = useReducer(layeredReducer, initialLayeredState);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runFrom = useCallback(async (from: Step, seed: Seed, signal: AbortSignal) => {
    const mint = seed.mint;
    let { token, symbol, reports, debate, risks } = seed;
    if (from === "l1") {
      const l1 = (await postJson("/api/l1", { mint }, signal)) as unknown as L1Result;
      token = l1.token;
      symbol = l1.symbol;
      reports = l1.reports;
      if (!signal.aborted) dispatch({ type: "L1_OK", token, symbol, reports });
    }
    if (signal.aborted) return;
    if (!reports) throw new Error("Missing L1 reports");
    const l2 = (await postJson("/api/l2", { mint, reports, rounds: 2 }, signal)) as unknown as L2Result;
    debate = l2.debate;
    if (!signal.aborted) dispatch({ type: "L2_OK", debate });
    if (signal.aborted) return;
    const l3 = (await postJson("/api/l3", { mint, reports, debate }, signal)) as unknown as L3Result;
    risks = l3.risks;
    if (!signal.aborted) dispatch({ type: "L3_OK", risks });
    if (signal.aborted) return;
    if (!token || !risks) throw new Error("Missing prior layer data");
    const l4 = (await postJson(
      "/api/l4",
      { mint, token, symbol: symbol ?? "", reports, debate, risks },
      signal
    )) as unknown as L4Result;
    if (!signal.aborted) dispatch({ type: "L4_OK", decision: l4.decision, shareId: l4.id });
  }, []);

  const start = useCallback(
    (mint: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "START", mint });
      void runFrom("l1", { mint }, controller.signal).catch((err) => {
        if (controller.signal.aborted) return;
        const s = stateRef.current;
        const step: Step = s.step === "l1" || s.step === "l2" || s.step === "l3" || s.step === "l4" ? s.step : "l1";
        dispatch({ type: "FAIL", step, message: err instanceof Error ? err.message : String(err) });
      });
    },
    [runFrom]
  );

  const retry = useCallback(() => {
    const s = stateRef.current;
    if (!s.failedStep || s.step !== "error") return;
    const controller = new AbortController();
    abortRef.current = controller;
    const step = s.failedStep;
    const seed: Seed = { mint: s.mint, token: s.token ?? undefined, symbol: s.symbol, reports: s.reports ?? undefined, debate: s.debate, risks: s.risks ?? undefined };
    dispatch({ type: "RETRY" });
    void runFrom(step, seed, controller.signal).catch((err) => {
      if (controller.signal.aborted) return;
      dispatch({ type: "FAIL", step, message: err instanceof Error ? err.message : String(err) });
    });
  }, [runFrom]);

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
      dispatch({ type: "L1_OK", token: s.token, symbol: s.symbol, reports: s.reports });
      dispatch({ type: "L2_OK", debate: s.debate });
      dispatch({ type: "L3_OK", risks: s.risks });
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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // private mode / quota: ignore
    }
  }, [state]);

  return { state, start, retry, reset };
}
