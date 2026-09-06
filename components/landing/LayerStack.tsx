"use client";

import { useState, type CSSProperties } from "react";
import Reveal from "./Reveal";

const LAYERS = [
  { id: "L1", side: "SCOUT LAYER", edge: "4 parallel", name: "Scout layer", desc: "Four analysts read one token in parallel — chain, chart, crowd, catalyst. One tool call each, one paragraph each. A miss degrades to MISSING, never invented.", meta: "4 parallel · ~22s" },
  { id: "L2", side: "CLASH LAYER", edge: "2 rounds", name: "Clash layer", desc: "Bull builds the case, bear tears it down — two rounds, both forced to cite layer-1 data. Every turn streams live into the transcript.", meta: "2 rounds · ~50s" },
  { id: "L3", side: "RISK LAYER", edge: "3 parallel", name: "Risk layer", desc: "Three reviewers sign off: exit liquidity, rug paths, whale concentration. Slippage on exit, collapse speed, unclosed doors.", meta: "3 parallel · ~14s" },
  { id: "L4", side: "VERDICT LAYER", edge: "1 call", name: "Verdict layer", desc: "Decider seals rating, confidence and key risks in machine-parseable shape. Saved to Supabase, share link minted.", meta: "1 call · ~15s" },
];

export default function LayerStack() {
  const [sel, setSel] = useState(0);
  const active = LAYERS[sel];

  return (
    <div>
      <div className="iso-scene" role="tablist" aria-label="Pipeline layers">
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
              onFocus={() => setSel(i)}
              className={`iso-slab ${on ? "iso-on" : ""}`}
              style={{ "--z": LAYERS.length - 1 - i } as CSSProperties}
            >
              <span aria-hidden="true" className="iso-face iso-left">{l.side}</span>
              <span aria-hidden="true" className="iso-face iso-right"><span className="iso-unmirror">{l.id} · {l.edge}</span></span>
              <span aria-hidden="true" className="iso-face iso-right">{l.id} · {l.edge}</span>
              <span className={`iso-top ${i === 0 ? "iso-top-green" : ""}`}>
                {i === 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static local webp
                  <img src="/logo.webp" alt="" width={72} height={72} className="iso-mark" />
                ) : (
                  <span aria-hidden="true" className="iso-id">{l.id}</span>
                )}
                <span className="sr-only">{l.id} {l.name}</span>
              </span>
            </button>
          );
        })}
      </div>
      <Reveal>
        <div className="land-stack-detail text-center md:text-left" aria-live="polite">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#15803d] uppercase">{active.id} — {active.meta}</p>
          <h3 className="font-display mt-1 text-xl font-bold text-black">{active.name}</h3>
          <p className="mt-2 font-mono text-[13px] leading-relaxed text-zinc-600">{active.desc}</p>
        </div>
      </Reveal>
    </div>
  );
}
