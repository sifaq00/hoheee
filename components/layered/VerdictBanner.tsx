import DecisionCard from "@/components/DecisionCard";
import { parseDecision } from "@/lib/decision";
import ShareLinkButton from "./ShareLinkButton";

function ratingTone(rating: string | null): { text: string; border: string; glow: string } {
  const r = (rating ?? "").toLowerCase();
  if (r.includes("buy") || r.includes("overweight")) return { text: "text-[#22c55e]", border: "border-[#22c55e]", glow: "shadow-[0_0_60px_rgba(34,197,94,0.25)]" };
  if (r.includes("sell") || r.includes("underweight")) return { text: "text-[#ef4444]", border: "border-[#ef4444]", glow: "shadow-[0_0_60px_rgba(239,68,68,0.25)]" };
  return { text: "text-zinc-200", border: "border-zinc-500", glow: "shadow-[0_0_60px_rgba(161,161,170,0.2)]" };
}

export default function VerdictBanner({ decision, shareId }: { decision: string; shareId: string }) {
  const parsed = parseDecision(decision);
  const tone = ratingTone(parsed.rating);
  return (
    <section aria-label="Verdict" className={`anim-in overflow-hidden rounded border ${tone.border} bg-black ${tone.glow}`}>
      <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
        <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">Final verdict</p>
        <p className={`font-display text-5xl font-black tracking-tight sm:text-6xl ${tone.text}`}>{parsed.rating ?? "?"}</p>
        {parsed.confidence && (
          <p className="mt-1 font-mono text-xs tracking-widest text-zinc-400 uppercase">Confidence · {parsed.confidence}</p>
        )}
        <div className="mt-4 flex justify-center">
          <ShareLinkButton shareId={shareId} />
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <DecisionCard markdown={decision} />
      </div>
    </section>
  );
}
