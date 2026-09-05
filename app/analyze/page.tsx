"use client";

import Link from "next/link";
import { useLayeredAnalysis } from "@/hooks/useLayeredAnalysis";
import { useWallet } from "@/context/WalletContext";
import WalletButton from "@/components/WalletButton";
import MintForm from "@/components/layered/MintForm";
import HistorySection from "@/components/layered/HistorySection";
import AnalystsSection from "@/components/layered/AnalystsSection";
import DebateSection from "@/components/layered/DebateSection";
import RiskSection from "@/components/layered/RiskSection";
import VerdictBanner from "@/components/layered/VerdictBanner";
import SectionPanel from "@/components/layered/SectionPanel";
import type { LayeredState } from "@/lib/layered/reducer";

const STEPS = [
  { id: "l1", label: "SCOUTS", hint: "4 analysts" },
  { id: "l2", label: "CLASH", hint: "bull vs bear" },
  { id: "l3", label: "RISK", hint: "3 reviewers" },
  { id: "l4", label: "VERDICT", hint: "decider" },
] as const;

const ORDER: LayeredState["step"][] = ["idle", "l1", "l2", "l3", "l4", "done"];

function Timeline({ step, note }: { step: LayeredState["step"]; note: string | null }) {
  const active = step === "error" ? -1 : ORDER.indexOf(step === "done" ? "done" : step);
  return (
    <ol aria-label="Pipeline progress" className="flex flex-col gap-0 rounded border border-white/10 bg-[#0c0f0c] p-4">
      {STEPS.map((s, i) => {
        const idx = i + 1;
        const done = active > idx || step === "done";
        const running = active === idx;
        return (
          <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className={`absolute top-6 left-[7px] h-[calc(100%-1.25rem)] w-px ${done ? "bg-[#22c55e]" : "bg-zinc-800"}`} />
            )}
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] ${
                done
                  ? "border-[#22c55e] bg-[#22c55e] text-black"
                  : running
                    ? "animate-pulse border-[#22c55e] bg-[#22c55e]/20 text-[#22c55e]"
                    : "border-zinc-700 text-transparent"
              }`}
            >
              ✓
            </span>
            <div className="min-w-0">
              <p className={`font-mono text-xs font-bold tracking-[0.18em] ${done || running ? "text-white" : "text-zinc-600"}`}>
                {s.label} <span className="font-normal text-zinc-500">· {s.hint}</span>
              </p>
              {running && note && (
                <p aria-live="polite" className="mt-0.5 truncate font-mono text-[11px] text-[#22c55e]">
                  {note}…
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Analyze() {
  const { state, start, retry, reset } = useLayeredAnalysis();
  const { connected, address, setIsModalOpen } = useWallet();
  const running = state.step === "l1" || state.step === "l2" || state.step === "l3" || state.step === "l4";
  const showFeed = running || state.step === "done" || state.step === "error";
  const done = state.step === "done" && state.decision && state.shareId;

  return (
    <div className="min-h-full">
      <div aria-hidden="true" className="land-grid pointer-events-none fixed inset-0" />
      <div className="relative mx-auto w-full px-4 py-6">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/" className="flex cursor-pointer items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
            <img src="/logo.webp" alt="Aries logo" width={30} height={30} className="rounded" />
            <span className="font-display text-sm font-bold tracking-[0.18em] text-white">ARIES</span>
          </Link>
          <span className="hidden font-mono text-[10px] tracking-[0.25em] text-zinc-600 uppercase sm:inline">/ TERMINAL</span>
          <div className="ml-auto flex items-center gap-3">
            {running && (
              <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-[#22c55e] uppercase">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" /> Live
              </span>
            )}
            <WalletButton />
          </div>
        </header>

        <main className="mt-6 flex flex-col gap-4">
          {!showFeed && (
            <>
              <SectionPanel index="//" title="Target lock" meta="mainnet">
                {!connected && (
                  <p className="mb-3 rounded border border-[#22c55e]/40 bg-[#22c55e]/5 px-3 py-2 font-mono text-xs text-zinc-300">
                    Connect your Solana wallet to run analysis — reports save to your wallet history.
                  </p>
                )}
                <MintForm
                  disabled={false}
                  onStart={(mint) => {
                    if (!connected) {
                      setIsModalOpen(true);
                      return;
                    }
                    start(mint, address);
                  }}
                />
              </SectionPanel>
              {connected && (
                <SectionPanel index="◈" title="Your reports" meta="this wallet">
                  <HistorySection wallet={address} />
                </SectionPanel>
              )}
            </>
          )}

          {showFeed && (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]" data-testid="analysis-feed">
              <div className="flex flex-col gap-4">
                <Timeline step={state.step} note={state.note} />
                <button
                  type="button"
                  onClick={reset}
                  className="cursor-pointer rounded border border-zinc-700 px-4 py-2 font-mono text-xs font-bold tracking-wider text-zinc-300 uppercase transition-colors hover:border-[#ef4444] hover:text-[#ef4444]"
                >
                  {state.step === "done" ? "New analysis" : "Abort run"}
                </button>
                {state.step === "error" && (
                  <div role="alert" className="rounded border border-[#ef4444] p-3 text-sm text-[#ef4444]">
                    <p className="font-mono text-xs">
                      {(state.failedStep ?? "run").toUpperCase()} FAILED: {state.error}
                    </p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-2 w-full cursor-pointer rounded border border-[#ef4444] px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase hover:bg-[#ef4444] hover:text-black"
                    >
                      Retry {state.failedStep}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                {done && <VerdictBanner decision={state.decision!} shareId={state.shareId!} />}
                {(state.token && state.reports) || state.liveToken ? (
                  <SectionPanel index="L1" title="Scout reports" meta="parallel">
                    <AnalystsSection
                      token={state.token ?? state.liveToken!}
                      symbol={state.token ? state.symbol : state.liveSymbol}
                      reports={state.reports ?? state.liveReports}
                      errors={state.l1Errors}
                    />
                  </SectionPanel>
                ) : null}
                {(state.debate.length > 0 || state.step === "l2") && (
                  <SectionPanel index="L2" title="Bull vs bear" meta={`${state.debate.length} turns`}>
                    <DebateSection debate={state.debate} pending={state.step === "l2"} />
                  </SectionPanel>
                )}
                {(state.risks || state.step === "l3") && (
                  <SectionPanel index="L3" title="Risk review" meta="parallel">
                    <RiskSection risks={state.risks} pending={state.step === "l3"} />
                  </SectionPanel>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="mt-8 border-t border-white/10 pt-4 font-mono text-[11px] leading-relaxed text-zinc-500">
          <p>
            Full run: 4 analysts, 2 debate rounds, risk review, decider. Thin data → MISSING reports, lower confidence. Automated research, not
            financial advice. Runs burn real model tokens — throttled per IP.
          </p>
        </footer>
      </div>
    </div>
  );
}
