"use client";

import { useEffect, useState } from "react";

const KEY = "aries-announce";

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "closed";
  } catch {
    return false;
  }
}

export default function AnnounceBar() {
  const [closed, setClosed] = useState(true);
  const [ready, setReady] = useState(false);

  // Read persisted dismissal only after mount: server has no sessionStorage,
  // and rendering open on first client paint would mismatch SSR HTML.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from sessionStorage */
  useEffect(() => {
    setClosed(isDismissed());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!ready || closed) return null;

  const dismiss = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(KEY, "closed");
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-10 items-center justify-center gap-3 bg-[#22c55e] px-12 text-black">
      <a href="/analyze" className="flex min-w-0 cursor-pointer items-center gap-2 font-mono text-xs font-bold">
        <span className="hidden rounded bg-black px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-[#22c55e] uppercase sm:inline">Live</span>
        <span className="truncate">
          Full run lands in <b>~2 minutes</b> — no wallet needed
        </span>
        <span aria-hidden="true">→</span>
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer px-1 text-lg leading-none text-black/60 hover:text-black"
      >
        ×
      </button>
    </div>
  );
}
