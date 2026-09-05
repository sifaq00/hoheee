"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WalletButton from "@/components/WalletButton";
import { ANNOUNCE_EVENT } from "./AnnounceBar";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#live", label: "Live demo" },
  { href: "#report", label: "Report" },
  { href: "#numbers", label: "Numbers" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(true);

  useEffect(() => {
    const h = (e: Event) => setAnnounceOpen((e as CustomEvent<{ open: boolean }>).detail.open);
    window.addEventListener(ANNOUNCE_EVENT, h);
    return () => window.removeEventListener(ANNOUNCE_EVENT, h);
  }, []);

  return (
    <>
      <header className={`sticky ${announceOpen ? "top-10" : "top-0"} z-50 border-b border-black/10 bg-white/90 backdrop-blur-md transition-[top] duration-300`}>
        <nav aria-label="Primary" className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4">
          <Link href="/" className="flex cursor-pointer items-center gap-2 justify-self-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
            <img src="/logo.webp" alt="Aries logo" width={28} height={28} className="rounded" />
            <span className="font-display text-sm font-bold tracking-[0.18em] text-black">ARIES</span>
          </Link>
          <div className="hidden items-center gap-7 justify-self-center lg:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="font-mono text-[13px] font-medium text-zinc-600 transition-colors hover:text-[#16a34a]">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 justify-self-end">
            <span className="hidden md:block">
              <WalletButton />
            </span>
            <Link
              href="/analyze"
              className="cursor-pointer rounded-md bg-[#22c55e] px-4 py-2 font-mono text-[13px] font-bold text-black transition-colors hover:bg-[#4ade80]"
            >
              Run analysis
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-black/15 text-black lg:hidden"
            >
              <span aria-hidden="true" className="font-mono text-lg leading-none">{open ? "×" : "≡"}</span>
            </button>
          </div>
        </nav>
      </header>

      {open && (
        <div className={`fixed inset-x-0 ${announceOpen ? "top-[104px]" : "top-16"} bottom-0 z-40 overflow-y-auto bg-white px-5 pt-2 pb-10 lg:hidden`} role="dialog" aria-label="Menu">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href} className="border-b border-black/[0.07]">
                <a href={l.href} onClick={() => setOpen(false)} className="flex cursor-pointer items-center justify-between py-4 font-mono text-base font-medium text-black">
                  {l.label}
                  <span aria-hidden="true" className="text-zinc-400">→</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            <WalletButton />
            <Link
              href="/analyze"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-md bg-[#22c55e] px-4 py-3 text-center font-mono text-sm font-bold text-black"
            >
              Run analysis
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
