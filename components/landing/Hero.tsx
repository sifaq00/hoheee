"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import LayerStack from "./LayerStack";

export default function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden="true" className="land-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-start gap-12 px-4 pt-14 pb-16 md:grid-cols-2 md:pt-20 md:pb-20">
        <div className="text-center md:text-left">
          <Reveal>
            <p className="inline-flex items-center gap-2.5 border border-black/15 bg-white px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.24em] text-black uppercase shadow-[2px_2px_0_0_#16a34a]">
              Autonomous token research squad
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 id="hero-title" className="font-display mt-6 text-4xl leading-[1.04] font-black tracking-tight text-black sm:text-5xl">
              Operational uncertainty, answered with <span className="bg-[#22c55e] px-2 text-black">working verdicts</span>.
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mx-auto mt-5 max-w-lg font-mono text-sm leading-relaxed text-zinc-600 md:mx-0">
              Aries runs a token research desk — one vertically-integrated stack from raw mint to finished report. Slice the layers to see
              how it is built. Every run ends in a rating you can read, share and verify.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link
                href="/analyze"
                className="group cursor-pointer rounded-md bg-[#22c55e] px-6 py-3 font-mono text-sm font-bold text-black transition-all duration-200 hover:bg-[#4ade80] active:scale-[0.98]"
              >
                See the work <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="#live"
                className="cursor-pointer rounded-md border border-black/20 bg-transparent px-6 py-3 font-mono text-sm text-black transition-colors duration-200 hover:border-[#16a34a] hover:text-[#15803d]"
              >
                Watch it work ↓
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <LayerStack />
        </Reveal>
      </div>
    </section>
  );
}
