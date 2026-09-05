import Link from "next/link";
import Reveal from "./Reveal";

export default function CtaBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-20" aria-labelledby="cta-title">
      <Reveal>
        <div className="relative overflow-hidden rounded border border-[#22c55e]/30 bg-gradient-to-br from-[#0d140e] to-black px-6 py-12 text-center">
          <div aria-hidden="true" className="land-grid pointer-events-none absolute inset-0 opacity-60" />
          <h2 id="cta-title" className="font-display relative text-2xl font-black text-white sm:text-4xl">
            PASTE A MINT. <span className="text-[#22c55e]">MEET THE DESK.</span>
          </h2>
          <p className="relative mx-auto mt-3 max-w-md font-mono text-xs leading-relaxed text-zinc-400">
            Free demo, throttled per IP. Your first verdict lands in about two minutes.
          </p>
          <Link
            href="/analyze"
            className="relative mt-6 inline-block cursor-pointer rounded border border-[#22c55e] bg-[#22c55e] px-8 py-3 font-mono text-sm font-bold text-black transition-all duration-200 hover:bg-transparent hover:text-[#22c55e]"
          >
            Start analyzing
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
