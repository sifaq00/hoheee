"use client";

import { useState } from "react";

export default function CopyLinkButton({ runId }: { runId: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${runId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied: ignore
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="cursor-pointer rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-zinc-300 uppercase transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
