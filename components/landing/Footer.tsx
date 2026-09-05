import Link from "next/link";

const COLS = [
  { head: "Product", links: [{ label: "Analyze", href: "/analyze" }, { label: "Live demo", href: "/#live" }, { label: "Report anatomy", href: "/#report" }] },
  { head: "Desk", links: [{ label: "How it works", href: "/#how" }, { label: "Numbers", href: "/#numbers" }, { label: "FAQ", href: "/#faq" }] },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.07] bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto_auto]">
        <div>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
            <img src="/logo.webp" alt="Aries logo" width={24} height={24} className="rounded" />
            <span className="font-display text-xs font-bold tracking-[0.18em] text-black">ARIES</span>
          </div>
          <p className="mt-4 max-w-sm font-mono text-[11px] leading-relaxed text-zinc-500">
            Research tool, not financial advice. Each run costs real model tokens. Background: “TradingAgents: Multi-Agents LLM Financial Trading
            Framework” (arXiv 2412.20138).
          </p>
        </div>
        {COLS.map((c) => (
          <nav key={c.head} aria-label={c.head}>
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{c.head}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="cursor-pointer font-mono text-[13px] text-zinc-600 transition-colors hover:text-[#15803d]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-black/[0.07]">
        <p className="mx-auto max-w-6xl px-4 py-5 font-mono text-[11px] text-zinc-500">© 2026 Aries — Solana token research squad.</p>
      </div>
    </footer>
  );
}
