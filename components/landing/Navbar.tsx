"use client";

import Link from "next/link";
import WalletButton from "@/components/WalletButton";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#live", label: "Live demo" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex cursor-pointer items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
          <img src="/logo.webp" alt="Aries logo" width={28} height={28} className="rounded" />
          <span className="font-display text-sm font-bold tracking-[0.18em] text-white">ARIES</span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-mono text-xs tracking-wider text-zinc-400 transition-colors hover:text-[#22c55e]">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <WalletButton />
          <Link
            href="/analyze"
            className="cursor-pointer rounded border border-[#22c55e] bg-[#22c55e] px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-black transition-colors hover:bg-transparent hover:text-[#22c55e]"
          >
            RUN ANALYSIS
          </Link>
        </div>
      </nav>
    </header>
  );
}
