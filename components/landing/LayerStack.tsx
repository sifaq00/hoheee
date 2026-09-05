"use client";

import { useState, type CSSProperties } from "react";

const LAYERS = [
  { id: "L1", name: "Scout layer", desc: "Four analysts read one token in parallel — chain, chart, crowd, catalyst. One tool call each, one paragraph each. A miss degrades to MISSING, never invented.", meta: "4 parallel · ~22s" },
  { id: "L2", name: "Clash layer", desc: "Bull builds the case, bear tears it down — two rounds, both forced to cite layer-1 data. Every turn streams live into the transcript.", meta: "2 rounds · ~50s" },
  { id: "L3", name: "Risk layer", desc: "Three reviewers sign off: exit liquidity, rug paths, whale concentration. Slippage on exit, collapse speed, unclosed doors.", meta: "3 parallel · ~14s" },
  { id: "L4", name: "Verdict layer", desc: "Decider seals rating, confidence and key risks in machine-parseable shape. Saved to Supabase, share link minted.", meta: "1 call · ~15s" },
];

export default function LayerStack() {
  const [sel, setSel] = useState(0);
  const active = LAYERS[sel];

  return (
    <div>
      <div className="land-stack" role="tablist" aria-label="Pipeline layers">
        {LAYERS.map((l, i) => {
          const on = i === sel;
          return (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSel(i)}
              onMouseEnter={() => setSel(i)}
              className={`land-slice ${on ? "land-slice-on" : ""}`}
              style={{ "--i": i } as CSSProperties}
            >
              <span className="land-slice-id">{l.id}</span>
              <span className="land-slice-name">{l.name}</span>
            </button>
          );
        })}
      </div>
      <div className="land-stack-detail" aria-live="polite">
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#22c55e] uppercase">{active.id} — {active.meta}</p>
        <h3 className="font-display mt-1 text-xl font-bold text-white">{active.name}</h3>
        <p className="mt-2 font-mono text-[13px] leading-relaxed text-zinc-400">{active.desc}</p>
      </div>
    </div>
  );
}
