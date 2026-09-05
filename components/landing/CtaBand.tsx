import Link from "next/link";
import Reveal from "./Reveal";

export default function CtaBand() {
  return (
    <section className="bg-[#22c55e] text-black" aria-labelledby="cta-title">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16 md:py-20">
        <Reveal>
          <h2 id="cta-title" className="font-display max-w-[16ch] text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
            Paste a mint. Meet the desk.
          </h2>
          <p className="mt-3 max-w-[46ch] font-mono text-sm font-medium text-black/70">
            Free demo, throttled per IP. Your first verdict lands in about two minutes.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <Link
            href="/analyze"
            className="cursor-pointer rounded-md bg-black px-8 py-3.5 font-mono text-sm font-bold text-[#22c55e] transition-colors hover:bg-zinc-900"
          >
            Start analyzing →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
