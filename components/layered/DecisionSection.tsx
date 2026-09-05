import DecisionCard from "@/components/DecisionCard";

export default function DecisionSection({ decision, shareId }: { decision: string; shareId: string }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Decision">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">L4 — Decision</h2>
      <DecisionCard markdown={decision} />
      <p className="text-sm text-zinc-400">
        Share link:{" "}
        <a className="font-mono text-[#22c55e] underline" href={`/r/${shareId}`}>
          /r/{shareId}
        </a>
      </p>
    </section>
  );
}
