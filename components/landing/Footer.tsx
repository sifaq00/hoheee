import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
          <img src="/logo.webp" alt="Aries logo" width={24} height={24} className="rounded" />
          <span className="font-display text-xs font-bold tracking-[0.18em] text-white">ARIES</span>
        </div>
        <p className="max-w-md text-center font-mono text-[11px] leading-relaxed text-zinc-500 sm:text-left">
          Research tool, not financial advice. Each run costs real model tokens. Background: “TradingAgents: Multi-Agents LLM Financial Trading
          Framework” (arXiv 2412.20138).
        </p>
        <Link href="/analyze" className="cursor-pointer font-mono text-xs text-[#22c55e] hover:underline">
          Analyze →
        </Link>
      </div>
    </footer>
  );
}
