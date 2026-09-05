"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ShareLinkButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <p className="flex items-center gap-2 font-mono text-xs text-zinc-400">
      <span className="text-zinc-500">Share link:</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          router.push(`/r/${shareId}`);
        }}
        className="flex cursor-pointer items-center gap-2 font-mono text-[#22c55e] underline hover:text-white disabled:cursor-wait disabled:opacity-70"
      >
        {pending && (
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-[#22c55e]"
          />
        )}
        <span aria-live="polite">{pending ? "opening…" : `/r/${shareId}`}</span>
      </button>
    </p>
  );
}
