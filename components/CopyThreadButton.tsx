"use client";

import { useState } from "react";

interface CopyThreadButtonProps {
  tokenName: string;
  tokenSymbol: string;
  rating: string;
  confidence: string;
  risks: string[];
  runId: string;
}

// Plain-text thread: hook tweet, up to 4 risk tweets, closer with link.
function buildThread(props: CopyThreadButtonProps): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${site}/r/${props.runId}`;
  const hook = `${props.rating} on ${props.tokenName} (${props.tokenSymbol}), confidence ${props.confidence}. Full AI research: ${link}`;
  const riskTweets = props.risks
    .slice(0, 4)
    .map((r, i) => `Risk ${i + 1}: ${r}`);
  const closer = `${link} — Not financial advice.`;
  return [hook, ...riskTweets, closer].join("\n\n");
}

export default function CopyThreadButton(props: CopyThreadButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(buildThread(props));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
    >
      {copied ? "Copied" : "Copy thread"}
    </button>
  );
}
