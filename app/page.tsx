"use client";

import { useLayeredAnalysis } from "@/hooks/useLayeredAnalysis";
import { useWallet } from "@/context/WalletContext";
import WalletButton from "@/components/WalletButton";
import HistorySection from "@/components/layered/HistorySection";
import MintForm from "@/components/layered/MintForm";
import AnalystsSection from "@/components/layered/AnalystsSection";
import DebateSection from "@/components/layered/DebateSection";
import RiskSection from "@/components/layered/RiskSection";
import DecisionSection from "@/components/layered/DecisionSection";
import type { LayeredState } from "@/lib/layered/reducer";

const STEPS = ["l1", "l2", "l3", "l4"] as const;
const LABELS: Record<(typeof STEPS)[number], string> = { l1: "Analysts", l2: "Debate", l3: "Risk", l4: "Decision" };

function StepRail({ step }: { step: LayeredState["step"] }) {
  const order = ["idle", "l1", "l2", "l3", "l4", "done"] as const;
  const active = step === "error" ? -1 : order.indexOf(step === "done" ? "done" : step);
  return (
    <div aria-label="Pipeline steps" className="grid grid-cols-2 gap-3 rounded border border-zinc-800 bg-zinc-950 p-3 lg:grid-cols-4">
      {STEPS.map((s, i) => {
        const done = active > i + 1 || step === "done";
        const running = active === i + 1;
        return (
          <div key={s} className="flex min-w-0 items-center gap-2">
            <span className={`font-mono text-sm ${done ? "text-[#22c55e]" : running ? "animate-pulse text-[#22c55e]" : "text-zinc-700"}`}>
              {done ? "■" : running ? "▶" : "□"}
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-zinc-300">{LABELS[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

function LiveNote({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <p aria-live="polite" className="font-mono text-xs text-[#22c55e]">
      {note}…
    </p>
  );
}

export default function Home() {
  const { state, start, retry, reset } = useLayeredAnalysis();
  const { connected, address } = useWallet();
  const running = state.step === "l1" || state.step === "l2" || state.step === "l3" || state.step === "l4";
  const showFeed = running || state.step === "done" || state.step === "error";
  const done = state.step === "done" && state.decision && state.shareId;

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10">
      <main className="w-full max-w-none flex flex-col gap-6">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          <header className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                {/* eslint-disable-next-line @next/next/no-img-element -- static local webp, no optimizer needed */}
                <img src="/logo.webp" alt="Aries logo" width={32} height={32} className="rounded" />
                Aries <span className="text-[#22c55e]">—</span> Solana Token Research
              </h1>
              <WalletButton />
            </div>
            <p className="text-sm text-zinc-400">Research tool, not financial advice. Full run takes a few minutes.</p>
          </header>

          {!showFeed && <MintForm disabled={false} onStart={(mint) => start(mint, connected ? address : undefined)} />}
          {!showFeed && connected && <HistorySection wallet={address} />}
        </div>

        {showFeed && (
          <div className="flex flex-col gap-4" data-testid="analysis-feed">
            {state.step === "error" && (
              <div role="alert" className="rounded border border-[#ef4444] p-3 text-sm text-[#ef4444]">
                <p>
                  {state.failedStep ?? "run"} failed: {state.error}
                </p>
                <button type="button" onClick={retry} className="mt-2 rounded border border-[#ef4444] px-3 py-1 font-semibold hover:bg-[#ef4444] hover:text-black">
                  Retry {state.failedStep}
                </button>
              </div>
            )}
            <StepRail step={state.step} />
            <LiveNote note={state.note} />
            {done && <DecisionSection decision={state.decision!} shareId={state.shareId!} />}
            {state.token && state.reports && <AnalystsSection token={state.token} symbol={state.symbol} reports={state.reports} />}
            <DebateSection debate={state.debate} />
            {state.risks && <RiskSection risks={state.risks} />}
            <button
              type="button"
              onClick={reset}
              className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              {state.step === "done" ? "New analysis" : "Cancel analysis"}
            </button>
          </div>
        )}
      </main>
      <footer className="mt-6 w-full border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
        <p>
          Each full run takes a few minutes: 4 analysts, 2 debate rounds, risk review, decider. New tokens have thin data — low liquidity and
          short history make signals unreliable. This system can be wrong: output is automated research, not financial advice. Each full run
          costs real model tokens — runs are throttled per IP for the demo.
        </p>
        <p className="mt-2">Research background: &ldquo;TradingAgents: Multi-Agents LLM Financial Trading Framework&rdquo; (arXiv 2412.20138).</p>
      </footer>
    </div>
  );
}
